import { z } from "zod";
import { redactChatbotMessage } from "@/lib/chatbot-redaction";
import { createClient } from "@/server/db/supabase-server";
import {
  addSupportMessage,
  addVisitorSupportMessage,
  createOrReopenVisitorConversation,
  ExpiredSupportConversationError,
  findVisitorConversation,
  isResolvedSupportConversationExpired,
  listConversationMessages,
  listSupportBookings,
  SupportMessageLimitError,
} from "@/server/queries/live-support.query";
import { getSpecialRequestCatalogForDisplay } from "@/server/queries/special-requests.query";
import { recordChatbotEvent } from "@/server/queries/chatbot-events.query";
import {
  checkRateLimits,
  hasOversizedBody,
  InvalidJsonError,
  logApiFailure,
  PayloadTooLargeError,
  rateLimitExceededResponse,
  RateLimitUnavailableError,
  rateLimitUnavailableResponse,
  readJsonBody,
  requestId,
} from "@/server/services/api-security";

const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_CONVERSATION_MESSAGES = 500;

const visitorTokenSchema = z.uuid();
const visitorMessageSchema = z
  .object({
    visitorToken: visitorTokenSchema,
    content: z.string().trim().min(1).max(2000),
    contactPhone: z.string().trim().max(32).nullable().optional(),
    locale: z.enum(["th", "en"]).optional(),
    contextMessage: z.string().trim().min(1).max(800).optional(),
  })
  .strict();

const waitingMessage = {
  th: "ส่งข้อความถึงเจ้าหน้าที่แล้ว กรุณารอสักครู่",
  en: "Your message has been sent to our team. Please wait a moment.",
} as const;

const handoffContextLabel = {
  th: "บริบทที่ส่งให้เจ้าหน้าที่:",
  en: "Context shared with our team:",
} as const;

function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^[+\d()\s-]+$/.test(value) ? value : null;
}

async function applyVisitorRateLimits(request: Request, visitorToken: string, operation: "read" | "write") {
  return checkRateLimits(request, [
    {
      scope: `live-support:${operation}:ip:minute`,
      limit: operation === "read" ? 120 : 30,
      windowSeconds: 60,
    },
    {
      scope: `live-support:${operation}:visitor:minute`,
      subject: visitorToken,
      limit: operation === "read" ? 30 : 10,
      windowSeconds: 60,
    },
    {
      scope: `live-support:${operation}:visitor:hour`,
      subject: visitorToken,
      limit: operation === "read" ? 600 : 120,
      windowSeconds: 60 * 60,
    },
  ]);
}

export async function GET(request: Request) {
  const id = requestId(request);
  const parsedToken = visitorTokenSchema.safeParse(new URL(request.url).searchParams.get("visitorToken"));
  if (!parsedToken.success) return Response.json({ error: "Invalid session" }, { status: 400 });

  try {
    const limit = await applyVisitorRateLimits(request, parsedToken.data, "read");
    if (!limit.allowed) return rateLimitExceededResponse(limit.retryAfterSeconds);

    const conversation = await findVisitorConversation(parsedToken.data);
    if (!conversation || isResolvedSupportConversationExpired(conversation)) {
      return Response.json(
        { conversation: null, messages: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const [messages, bookings] = await Promise.all([
      listConversationMessages(conversation.id),
      listSupportBookings(conversation),
    ]);
    const booking = bookings[0] ?? null;
    const allowsSpecialRequests = Boolean(booking && messages.some((message) =>
      message.sender === "system" &&
      message.content.startsWith(`Booking ${booking.bookingCode} is ready for confirmation with special requests.`),
    ));
    const specialRequestOptions = allowsSpecialRequests
      ? (await getSpecialRequestCatalogForDisplay()).filter((option) => option.category === "special")
      : [];
    return Response.json(
      { conversation, messages, booking, specialRequestOptions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logApiFailure("live-support:visitor:read", id, error);
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailableResponse();
    return Response.json({ error: "Unable to load support messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  if (hasOversizedBody(request, MAX_REQUEST_BYTES)) {
    return Response.json({ error: "Request body is too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json({ error: error.message }, { status: 413 });
    }
    if (error instanceof InvalidJsonError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    logApiFailure("live-support:visitor:parse", id, error);
    return Response.json({ error: "Invalid support message" }, { status: 400 });
  }
  const parsed = visitorMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid support message" }, { status: 400 });
  }

  const contactPhone = normalizePhone(parsed.data.contactPhone);
  if (parsed.data.contactPhone && !contactPhone) {
    return Response.json({ error: "Invalid contact phone" }, { status: 400 });
  }

  try {
    const limit = await applyVisitorRateLimits(request, parsed.data.visitorToken, "write");
    if (!limit.allowed) return rateLimitExceededResponse(limit.retryAfterSeconds);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { conversation, started } = await createOrReopenVisitorConversation(
      parsed.data.visitorToken,
      contactPhone,
      user?.id ?? null,
    );
    const message = await addVisitorSupportMessage(
      conversation.id,
      parsed.data.content,
      MAX_CONVERSATION_MESSAGES,
    );
    const systemMessage = started
      ? await addSupportMessage(conversation.id, "system", waitingMessage[parsed.data.locale ?? "en"])
      : null;
    const contextMessage = started
      && parsed.data.contextMessage
      && parsed.data.contextMessage !== parsed.data.content
      ? await addSupportMessage(
        conversation.id,
        "system",
        `${handoffContextLabel[parsed.data.locale ?? "en"]}\n${parsed.data.contextMessage}`,
      )
      : null;
    if (started && parsed.data.contextMessage) {
      try {
        await recordChatbotEvent({
          requestId: id,
          eventType: "handoff",
          intent: "unknown",
          responseMode: "demo",
          fallbackReason: null,
          handoffReason: "live_support_started",
          messageRedacted: redactChatbotMessage(parsed.data.contextMessage),
        });
      } catch (error) {
        logApiFailure("live-support:handoff-event", id, error);
      }
    }
    return Response.json({ conversation, message, systemMessage, contextMessage }, { status: 201 });
  } catch (error) {
    if (error instanceof ExpiredSupportConversationError) {
      return Response.json(
        { error: "This support session has expired. Start a new request.", expired: true },
        { status: 409 },
      );
    }
    logApiFailure("live-support:visitor:write", id, error);
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailableResponse();
    if (error instanceof SupportMessageLimitError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: "Unable to send support message" }, { status: 500 });
  }
}
