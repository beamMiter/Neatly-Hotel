import {
  addSupportMessage,
  countWaitingSupportConversations,
  getSupportCustomer,
  listActiveSupportAgents,
  listSupportBookings,
  listConversationMessages,
  listSupportConversations,
  markSupportConversationRead,
  updateSupportConversation,
} from "@/server/queries/live-support.query";
import { generateLiveSupportSummary } from "@/server/queries/live-support-summary.query";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";
import { createClient } from "@/server/db/supabase-server";

async function authorizeStaff() {
  try {
    return await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function GET(request: Request) {
  const auth = await authorizeStaff();
  if (auth instanceof Response) return auth;

  try {
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("notifications") === "true") {
      const unreadCount = await countWaitingSupportConversations();
      return Response.json({ unreadCount }, { headers: { "Cache-Control": "no-store" } });
    }

    const conversationId = searchParams.get("conversationId");
    const [conversations, agents] = await Promise.all([
      listSupportConversations(auth.userId),
      listActiveSupportAgents(),
    ]);
    const selectedConversationId = conversationId ?? conversations[0]?.id ?? null;
    const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
    if (selectedConversation) await markSupportConversationRead(selectedConversation.id, auth.userId);
    const [messages, customer, bookings] = selectedConversation
      ? await Promise.all([
          listConversationMessages(selectedConversation.id),
          getSupportCustomer(selectedConversation.customer_id),
          listSupportBookings(selectedConversation),
        ])
      : [[], null, []];

    return Response.json({
      conversations,
      agents,
      currentAdminId: auth.userId,
      selectedConversationId,
      messages,
      customer,
      bookings,
    });
  } catch (error) {
    console.error("Live support admin read failed:", error);
    return Response.json({ error: "Unable to load support conversations" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeStaff();
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as {
    conversationId?: unknown;
    assignedAgentId?: unknown;
    status?: unknown;
  } | null;
  if (typeof body?.conversationId !== "string") {
    return Response.json({ error: "Invalid conversation" }, { status: 400 });
  }

  const update: { assigned_agent_id?: string | null; status?: "waiting" | "active" | "resolved"; resolved_at?: string | null } = {};
  if (body.assignedAgentId === null || typeof body.assignedAgentId === "string") {
    update.assigned_agent_id = body.assignedAgentId;
  }
  if (body.status === "waiting" || body.status === "active" || body.status === "resolved") {
    update.status = body.status;
    update.resolved_at = body.status === "resolved" ? new Date().toISOString() : null;
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No update supplied" }, { status: 400 });
  }

  try {
    let conversation = await updateSupportConversation(body.conversationId, update);
    if (body.status === "resolved") {
      conversation = await generateLiveSupportSummary(body.conversationId);
    }
    return Response.json({ conversation });
  } catch (error) {
    console.error("Live support conversation update failed:", error);
    return Response.json({ error: "Unable to update support conversation" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeStaff();
  if (auth instanceof Response) return auth;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = (await request.json().catch(() => null)) as {
    conversationId?: unknown;
    content?: unknown;
  } | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (typeof body?.conversationId !== "string" || !content || content.length > 2000) {
    return Response.json({ error: "Invalid support message" }, { status: 400 });
  }

  try {
    const message = await addSupportMessage(body.conversationId, "agent", content, user?.email ?? "Admin");
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Live support admin write failed:", error);
    return Response.json({ error: "Unable to send support message" }, { status: 500 });
  }
}
