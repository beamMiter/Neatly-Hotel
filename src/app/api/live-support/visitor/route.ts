import {
  addSupportMessage,
  createOrReopenVisitorConversation,
  findVisitorConversation,
  listConversationMessages,
} from "@/server/queries/live-support.query";
import { createClient } from "@/server/db/supabase-server";

type VisitorRequest = {
  visitorToken?: unknown;
  content?: unknown;
  contactPhone?: unknown;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^[+\d()\s-]+$/.test(phone) ? phone : null;
}

export async function GET(request: Request) {
  const visitorToken = new URL(request.url).searchParams.get("visitorToken");
  if (!isUuid(visitorToken)) return Response.json({ error: "Invalid session" }, { status: 400 });

  try {
    const conversation = await findVisitorConversation(visitorToken);
    if (!conversation) return Response.json({ conversation: null, messages: [] });

    const messages = await listConversationMessages(conversation.id);
    return Response.json({ conversation, messages });
  } catch (error) {
    console.error("Live support visitor read failed:", error);
    return Response.json({ error: "Unable to load support messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as VisitorRequest | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const contactPhone = normalizePhone(body?.contactPhone);
  if (!isUuid(body?.visitorToken) || !content || content.length > 2000 || (body?.contactPhone && !contactPhone)) {
    return Response.json({ error: "Invalid support message" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const conversation = await createOrReopenVisitorConversation(
      body.visitorToken,
      contactPhone,
      user?.id ?? null,
    );
    const message = await addSupportMessage(conversation.id, "visitor", content);
    return Response.json({ conversation, message }, { status: 201 });
  } catch (error) {
    console.error("Live support visitor write failed:", error);
    return Response.json({ error: "Unable to send support message" }, { status: 500 });
  }
}
