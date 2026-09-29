import { getSupportConversation, markSupportConversationRead } from "@/server/queries/live-support.query";
import { authorizationErrorResponse, requireStaff } from "@/server/services/authorization";

async function authorizeStaff() {
  try {
    return await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function POST(request: Request) {
  const auth = await authorizeStaff();
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as { conversationId?: unknown } | null;
  if (typeof body?.conversationId !== "string") {
    return Response.json({ error: "Invalid conversation" }, { status: 400 });
  }

  try {
    const conversation = await getSupportConversation(body.conversationId);
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });

    const lastReadAt = await markSupportConversationRead(conversation.id, auth.userId);
    return Response.json({ lastReadAt });
  } catch (error) {
    console.error("Live support read receipt failed:", error);
    return Response.json({ error: "Unable to mark conversation as read" }, { status: 500 });
  }
}
