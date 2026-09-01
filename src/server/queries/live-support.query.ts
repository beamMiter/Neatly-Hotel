import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type {
  SupportAgent,
  SupportBooking,
  SupportConversation,
  SupportCustomer,
  SupportMessage,
} from "@/types/live-support";

export class SupportMessageLimitError extends Error {
  constructor() {
    super("This support conversation has reached its message limit");
    this.name = "SupportMessageLimitError";
  }
}

const RESOLVED_CONVERSATION_REOPEN_WINDOW_MS = 72 * 60 * 60 * 1000;

export class ExpiredSupportConversationError extends Error {
  constructor() {
    super("This support conversation has expired");
    this.name = "ExpiredSupportConversationError";
  }
}

export function isResolvedSupportConversationExpired(conversation: SupportConversation, now = Date.now()) {
  if (conversation.status !== "resolved") return false;
  if (!conversation.resolved_at) return true;

  const resolvedAt = new Date(conversation.resolved_at).getTime();
  return !Number.isFinite(resolvedAt) || now - resolvedAt > RESOLVED_CONVERSATION_REOPEN_WINDOW_MS;
}

export async function findVisitorConversation(visitorToken: string) {
  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .select("*")
    .eq("visitor_token", visitorToken)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SupportConversation | null;
}

async function getSupportCustomerName(customerId: string | null) {
  if (!customerId) return null;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const name = data ? `${data.first_name} ${data.last_name}`.trim() : "";
  return name || null;
}

export async function createOrReopenVisitorConversation(
  visitorToken: string,
  customerPhone: string | null,
  customerId: string | null,
) {
  const existingConversation = await findVisitorConversation(visitorToken);
  if (existingConversation && existingConversation.status !== "resolved") {
    const customerName = customerId && !existingConversation.customer_name
      ? await getSupportCustomerName(customerId)
      : null;
    const update = {
      ...(customerPhone && existingConversation.customer_phone !== customerPhone ? { customer_phone: customerPhone } : {}),
      ...(customerId && existingConversation.customer_id !== customerId ? { customer_id: customerId } : {}),
      ...(customerName ? { customer_name: customerName } : {}),
    };
    const conversation = Object.keys(update).length > 0
      ? await updateSupportConversation(existingConversation.id, update)
      : existingConversation;
    return { conversation, started: false };
  }

  if (existingConversation) {
    if (isResolvedSupportConversationExpired(existingConversation)) {
      throw new ExpiredSupportConversationError();
    }

    const conversation = await updateSupportConversation(existingConversation.id, {
      assigned_agent_id: null,
      customer_phone: customerPhone ?? existingConversation.customer_phone,
      customer_id: customerId ?? existingConversation.customer_id,
      customer_name: (customerId ? await getSupportCustomerName(customerId) : null) ?? existingConversation.customer_name,
      resolved_at: null,
      status: "waiting",
      summary: null,
      summary_generated_at: null,
    });
    return { conversation, started: true };
  }

  const customerName = await getSupportCustomerName(customerId);
  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .insert({ visitor_token: visitorToken, customer_phone: customerPhone, customer_id: customerId, customer_name: customerName, status: "waiting" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { conversation: data as SupportConversation, started: true };
}

export async function listConversationMessages(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as SupportMessage[];
}

export async function addSupportMessage(
  conversationId: string,
  sender: SupportMessage["sender"],
  content: string,
  senderName?: string,
) {
  const { data, error } = await supabaseAdmin
    .from("support_messages")
    .insert({
      conversation_id: conversationId,
      sender,
      content,
      sender_name: senderName ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SupportMessage;
}

export async function addVisitorSupportMessage(
  conversationId: string,
  content: string,
  maxMessages: number,
) {
  const { data, error } = await supabaseAdmin
    .rpc("add_visitor_support_message", {
      p_conversation_id: conversationId,
      p_content: content,
      p_max_messages: maxMessages,
    })
    .single();

  if (error) {
    if (error.code === "P0001" && error.message.includes("support_message_limit_reached")) {
      throw new SupportMessageLimitError();
    }
    throw new Error(error.message);
  }

  return data as SupportMessage;
}

export async function listSupportConversations(adminId: string) {
  const [{ data: conversations, error: conversationsError }, { data: messages, error: messagesError }, { data: readReceipts, error: receiptsError }] = await Promise.all([
    supabaseAdmin.from("support_conversations").select("*").order("last_message_at", { ascending: false }),
    supabaseAdmin.from("support_messages").select("conversation_id, sender, content, created_at"),
    supabaseAdmin.from("support_conversation_read_receipts").select("conversation_id, last_read_at").eq("admin_id", adminId),
  ]);

  if (conversationsError) throw new Error(conversationsError.message);
  if (messagesError) throw new Error(messagesError.message);
  if (receiptsError) throw new Error(receiptsError.message);

  const customerIds = [...new Set((conversations ?? [])
    .map((conversation) => conversation.customer_id)
    .filter((customerId): customerId is string => Boolean(customerId)))];
  const { data: profiles, error: profilesError } = customerIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, first_name, last_name").in("id", customerIds)
    : { data: [], error: null };
  if (profilesError) throw new Error(profilesError.message);
  const customerNameById = new Map((profiles ?? []).map((profile) => [
    profile.id,
    (profile.first_name + " " + profile.last_name).trim(),
  ]));

  const latestVisitorMessageByConversation = new Map<string, string>();
  const latestMessageByConversation = new Map<string, { content: string; createdAt: string }>();
  for (const message of messages ?? []) {
    const latestMessage = latestMessageByConversation.get(message.conversation_id);
    if (!latestMessage || new Date(message.created_at).getTime() > new Date(latestMessage.createdAt).getTime()) {
      latestMessageByConversation.set(message.conversation_id, { content: message.content, createdAt: message.created_at });
    }
    if (message.sender !== "visitor") continue;
    const latest = latestVisitorMessageByConversation.get(message.conversation_id);
    if (!latest || new Date(message.created_at).getTime() > new Date(latest).getTime()) {
      latestVisitorMessageByConversation.set(message.conversation_id, message.created_at);
    }
  }
  const readAtByConversation = new Map((readReceipts ?? []).map((receipt) => [receipt.conversation_id, receipt.last_read_at]));

  return (conversations ?? []).map((conversation) => ({
    ...conversation,
    customer_name: conversation.customer_name ?? (conversation.customer_id ? customerNameById.get(conversation.customer_id) || null : null),
    latest_visitor_message_at: latestVisitorMessageByConversation.get(conversation.id) ?? null,
    last_read_at: readAtByConversation.get(conversation.id) ?? null,
    latest_message_content: latestMessageByConversation.get(conversation.id)?.content ?? null,
  })) as SupportConversation[];
}

export async function markSupportConversationRead(conversationId: string, adminId: string) {
  const lastReadAt = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("support_conversation_read_receipts")
    .upsert(
      { conversation_id: conversationId, admin_id: adminId, last_read_at: lastReadAt },
      { onConflict: "conversation_id,admin_id" },
    );

  if (error) throw new Error(error.message);
  return lastReadAt;
}

export async function countWaitingSupportConversations() {
  const { count, error } = await supabaseAdmin
    .from("support_conversations")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getSupportConversation(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SupportConversation | null;
}

export async function updateSupportConversation(
  conversationId: string,
  update: Partial<Pick<SupportConversation, "assigned_agent_id" | "booking_id" | "customer_name" | "customer_phone" | "customer_id" | "status" | "resolved_at" | "summary" | "summary_generated_at">>,
) {
  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .update(update)
    .eq("id", conversationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SupportConversation;
}

export async function claimSupportConversation(conversationId: string, agentId: string) {
  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .update({ assigned_agent_id: agentId, status: "active", resolved_at: null })
    .eq("id", conversationId)
    .is("assigned_agent_id", null)
    .in("status", ["waiting", "active"])
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SupportConversation | null;
}

export async function takeOverSupportConversation(
  conversationId: string,
  agentId: string,
  expectedAssignedAgentId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .update({ assigned_agent_id: agentId, status: "active", resolved_at: null })
    .eq("id", conversationId)
    .eq("assigned_agent_id", expectedAssignedAgentId)
    .in("status", ["waiting", "active"])
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SupportConversation | null;
}

export async function listActiveSupportAgents(): Promise<SupportAgent[]> {
  const [{ data: staffMembers, error: staffError }, { data: users, error: usersError }] = await Promise.all([
    supabaseAdmin.from("staff_members").select("user_id").eq("role", "admin").eq("is_active", true),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (staffError) throw new Error(staffError.message);
  if (usersError) throw new Error(usersError.message);

  const userById = new Map(users.users.map((user) => [user.id, user]));
  return (staffMembers ?? []).map((staffMember) => {
    const user = userById.get(staffMember.user_id);
    return { id: staffMember.user_id, label: user?.email ?? `Admin ${staffMember.user_id.slice(0, 6)}` };
  });
}

export async function getSupportCustomer(customerId: string | null): Promise<SupportCustomer | null> {
  if (!customerId) return null;

  const [{ data: profile, error: profileError }, { data: userResult, error: userError }] = await Promise.all([
    supabaseAdmin.from("profiles").select("first_name, last_name, phone, country").eq("id", customerId).maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(customerId),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (userError) throw new Error(userError.message);
  if (!profile && !userResult.user) return null;

  return {
    name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Guest",
    email: userResult.user?.email ?? null,
    phone: profile?.phone ?? null,
    country: profile?.country ?? null,
  };
}

type SupportBookingRow = {
  id: string;
  booking_code: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number | string;
  addons_total: number | string;
  special_requests: { code: string; label: string; price: number; quantity?: number }[] | null;
  booking_rooms: { rooms: { room_type: string } | null }[] | null;
};

export async function listSupportBookings(conversation: SupportConversation): Promise<SupportBooking[]> {
  let request = supabaseAdmin
    .from("bookings")
    .select("id, booking_code, check_in, check_out, status, total_amount, addons_total, special_requests, booking_rooms(rooms(room_type))")
    .order("created_at", { ascending: false })
    .limit(3);

  if (conversation.booking_id) request = request.eq("id", conversation.booking_id);
  else if (conversation.customer_id) request = request.eq("customer_id", conversation.customer_id);
  else return [];

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as SupportBookingRow[]).map((booking) => ({
    id: booking.id,
    bookingCode: booking.booking_code,
    roomType: booking.booking_rooms?.[0]?.rooms?.room_type ?? "Room not specified",
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    status: booking.status,
    totalAmount: Number(booking.total_amount),
    addonsTotal: Number(booking.addons_total),
    specialRequests: (booking.special_requests ?? []).map((item) => ({ ...item, quantity: item.quantity ?? 1 })),
  }));
}
