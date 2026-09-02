import { z } from "zod";
import {
  authorizationErrorResponse,
  requireStaff,
  type StaffAuthContext,
} from "@/server/services/authorization";
import {
  createChatbotSuggestion,
  deleteChatbotSuggestion,
  updateChatbotSettings,
  updateChatbotSuggestion,
} from "@/server/queries/chatbot-cms.query";

const suggestionSchema = z.object({
  id: z.string().trim().min(1).max(100),
  topic: z.string().trim().min(1).max(200),
  format: z.enum(["Room type", "Message", "Option with details"]),
  reply: z.string().trim().min(1).max(2000),
  button_name: z.string().trim().max(100).nullable(),
  rooms: z.array(z.string().trim().min(1).max(100)).max(20),
  options: z.array(z.object({ name: z.string().trim().min(1).max(100), details: z.string().trim().min(1).max(1000) }).strict()).max(20),
  translations: z.record(z.enum(["th", "en"]), z.object({
    topic: z.string().trim().min(1).max(200),
    reply: z.string().trim().min(1).max(2000),
    button_name: z.string().trim().max(100).nullable(),
    options: z.array(z.object({ name: z.string().trim().min(1).max(100), details: z.string().trim().min(1).max(1000) }).strict()).max(20),
  }).strict()).optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(10000),
}).strict();

const settingsSchema = z.object({
  greeting_message: z.string().trim().min(3).max(2000),
  auto_reply_message: z.string().trim().min(3).max(2000),
  greeting_message_th: z.string().trim().min(3).max(2000),
  greeting_message_en: z.string().trim().min(3).max(2000),
  auto_reply_message_th: z.string().trim().min(3).max(2000),
  auto_reply_message_en: z.string().trim().min(3).max(2000),
}).strict();

function validationMessage(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
    .join("; ");
}

async function authorizeStaff(): Promise<StaffAuthContext | Response> {
  try {
    return await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function PATCH(request: Request) {
  const admin = await authorizeStaff();
  if (admin instanceof Response) return admin;
  const body = await request.json() as unknown;
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const record = body as Record<string, unknown>;

  try {
    if (record.resource === "settings") {
      const parsed = settingsSchema.safeParse(record.data);
      if (!parsed.success) return Response.json({ error: "Invalid settings" }, { status: 400 });
      console.info("[chatbot-admin-audit]", { actorId: admin.userId, action: "update_settings" });
      return Response.json({ settings: await updateChatbotSettings(parsed.data) });
    }
    if (record.resource === "suggestion") {
      const id = z.string().trim().min(1).max(100).safeParse(record.id);
      const suggestionData = record.data && typeof record.data === "object"
        ? (() => {
            const data = { ...(record.data as Record<string, unknown>) };
            delete data.id;
            return data;
          })()
        : record.data;
      const parsed = suggestionSchema.partial().omit({ id: true }).safeParse(suggestionData);
      if (!id.success) return Response.json({ error: `Invalid suggestion: ${validationMessage(id.error)}` }, { status: 400 });
      if (!parsed.success) return Response.json({ error: `Invalid suggestion: ${validationMessage(parsed.error)}` }, { status: 400 });
      console.info("[chatbot-admin-audit]", { actorId: admin.userId, action: "update_suggestion", resourceId: id.data });
      return Response.json({ suggestion: await updateChatbotSuggestion(id.data, parsed.data) });
    }
    return Response.json({ error: "Unknown resource" }, { status: 400 });
  } catch (error) {
    console.error("[chatbot-admin] Unable to save chatbot configuration", error);
    return Response.json({ error: "Unable to save chatbot configuration" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await authorizeStaff();
  if (admin instanceof Response) return admin;
  const body = await request.json() as unknown;
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const record = body as Record<string, unknown>;
  if (record.resource !== "suggestion") return Response.json({ error: "Unknown resource" }, { status: 400 });
  const parsed = suggestionSchema.safeParse(record.data);
  if (!parsed.success) return Response.json({ error: `Invalid suggestion: ${validationMessage(parsed.error)}` }, { status: 400 });
  try {
    console.info("[chatbot-admin-audit]", { actorId: admin.userId, action: "create_suggestion", resourceId: parsed.data.id });
    return Response.json({ suggestion: await createChatbotSuggestion(parsed.data) }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to create chatbot suggestion" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const admin = await authorizeStaff();
    if (admin instanceof Response) return admin;
    const parsed = z.object({ resource: z.literal("suggestion"), id: z.string().trim().min(1).max(100) }).strict().safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid suggestion" }, { status: 400 });
  try {
    console.info("[chatbot-admin-audit]", { actorId: admin.userId, action: "delete_suggestion", resourceId: parsed.data.id });
    await deleteChatbotSuggestion(parsed.data.id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Unable to delete chatbot suggestion" }, { status: 500 });
  }
}
