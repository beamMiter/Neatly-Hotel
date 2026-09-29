import {
  addSupportMessage,
  countUnassignedSupportConversations,
  claimSupportConversation,
  getSupportConversation,
  getSupportCustomer,
  listActiveSupportAgents,
  listSupportBookings,
  listConversationMessages,
  listSupportConversations,
  takeOverSupportConversation,
  updateSupportConversation,
} from "@/server/queries/live-support.query";
import {
  generateLiveSupportSummary,
  LiveSupportSummaryError,
} from "@/server/queries/live-support-summary.query";
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
      const unassignedCount = await countUnassignedSupportConversations();
      return Response.json(
        { unassignedCount },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const conversationId = searchParams.get("conversationId");
    const [conversations, agents] = await Promise.all([
      listSupportConversations(auth.userId),
      listActiveSupportAgents(),
    ]);
    const selectedConversationId =
      conversationId ?? conversations[0]?.id ?? null;
    const selectedConversation =
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) ?? null;
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
    return Response.json(
      { error: "Unable to load support conversations" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeStaff();
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as {
    conversationId?: unknown;
    action?: unknown;
    expectedAssignedAgentId?: unknown;
    status?: unknown;
  } | null;
  if (typeof body?.conversationId !== "string") {
    return Response.json({ error: "Invalid conversation" }, { status: 400 });
  }

  const action =
    body.action === "claim" ||
    body.action === "takeover" ||
    body.action === "regenerate_summary"
      ? body.action
      : null;
  const status =
    body.status === "active" || body.status === "resolved"
      ? body.status
      : undefined;
  if (!action && !status) {
    return Response.json({ error: "No update supplied" }, { status: 400 });
  }

  try {
    if (action === "claim") {
      const conversation = await claimSupportConversation(
        body.conversationId,
        auth.userId,
      );
      if (!conversation) {
        return Response.json(
          {
            error:
              "This conversation has already been claimed or is no longer open",
          },
          { status: 409 },
        );
      }
      return Response.json({ conversation });
    }

    if (action === "takeover") {
      if (typeof body.expectedAssignedAgentId !== "string") {
        return Response.json(
          { error: "Invalid current assignee" },
          { status: 400 },
        );
      }
      const conversation = await takeOverSupportConversation(
        body.conversationId,
        auth.userId,
        body.expectedAssignedAgentId,
      );
      if (!conversation) {
        return Response.json(
          {
            error:
              "This conversation assignment changed. Refresh and try again.",
          },
          { status: 409 },
        );
      }
      return Response.json({ conversation });
    }

    const currentConversation = await getSupportConversation(
      body.conversationId,
    );
    if (!currentConversation)
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    if (currentConversation.assigned_agent_id !== auth.userId) {
      return Response.json(
        { error: "Only the assigned agent can update this conversation" },
        { status: 403 },
      );
    }

    if (action === "regenerate_summary") {
      if (currentConversation.status !== "resolved") {
        return Response.json(
          { error: "Resolve the conversation before generating its summary" },
          { status: 409 },
        );
      }
      const conversation = await generateLiveSupportSummary(
        body.conversationId,
      );
      return Response.json({ conversation });
    }

    let conversation = await updateSupportConversation(body.conversationId, {
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    });
    if (status === "resolved") {
      conversation = await generateLiveSupportSummary(body.conversationId);
    }
    return Response.json({ conversation });
  } catch (error) {
    if (error instanceof LiveSupportSummaryError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("Live support conversation update failed:", error);
    return Response.json(
      { error: "Unable to update support conversation" },
      { status: 500 },
    );
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
  if (
    typeof body?.conversationId !== "string" ||
    !content ||
    content.length > 2000
  ) {
    return Response.json({ error: "Invalid support message" }, { status: 400 });
  }

  try {
    const conversation = await getSupportConversation(body.conversationId);
    if (!conversation)
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    if (conversation.status === "resolved") {
      return Response.json(
        { error: "Reopen this conversation before replying" },
        { status: 409 },
      );
    }
    if (conversation.assigned_agent_id !== auth.userId) {
      return Response.json(
        { error: "Only the assigned agent can reply to this conversation" },
        { status: 403 },
      );
    }

    const message = await addSupportMessage(
      body.conversationId,
      "agent",
      content,
      user?.email ?? "Admin",
    );
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Live support admin write failed:", error);
    return Response.json(
      { error: "Unable to send support message" },
      { status: 500 },
    );
  }
}
