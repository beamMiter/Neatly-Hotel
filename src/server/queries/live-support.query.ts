import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type {
  SupportAgent,
  SupportBooking,
  SupportConversation,
  SupportCustomer,
  SupportMessage,
  SupportMemberMatch,
} from "@/types/live-support";

export class SupportMessageLimitError extends Error {
  constructor() {
    super("This support conversation has reached its message limit");
    this.name = "SupportMessageLimitError";
  }
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

export async function createOrReopenVisitorConversation(
  visitorToken: string,
  customerPhone: string | null,
  customerId: string | null,
) {
  const existingConversation = await findVisitorConversation(visitorToken);
  if (existingConversation && existingConversation.status !== "resolved") {
    const update = {
      ...(customerPhone && existingConversation.customer_phone !== customerPhone ? { customer_phone: customerPhone } : {}),
      ...(customerId && existingConversation.customer_id !== customerId ? { customer_id: customerId } : {}),
    };
    return Object.keys(update).length > 0
      ? updateSupportConversation(existingConversation.id, update)
      : existingConversation;
  }

  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .upsert(
      { visitor_token: visitorToken, customer_phone: customerPhone, customer_id: customerId, status: "waiting", resolved_at: null },
      { onConflict: "visitor_token" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SupportConversation;
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
  const [{ data: conversations, error: conversationsError }, { data: visitorMessages, error: messagesError }, { data: readReceipts, error: receiptsError }] = await Promise.all([
    supabaseAdmin.from("support_conversations").select("*").order("last_message_at", { ascending: false }),
    supabaseAdmin.from("support_messages").select("conversation_id, created_at").eq("sender", "visitor"),
    supabaseAdmin.from("support_conversation_read_receipts").select("conversation_id, last_read_at").eq("admin_id", adminId),
  ]);

  if (conversationsError) throw new Error(conversationsError.message);
  if (messagesError) throw new Error(messagesError.message);
  if (receiptsError) throw new Error(receiptsError.message);

  const latestVisitorMessageByConversation = new Map<string, string>();
  for (const message of visitorMessages ?? []) {
    const latest = latestVisitorMessageByConversation.get(message.conversation_id);
    if (!latest || new Date(message.created_at).getTime() > new Date(latest).getTime()) {
      latestVisitorMessageByConversation.set(message.conversation_id, message.created_at);
    }
  }
  const readAtByConversation = new Map((readReceipts ?? []).map((receipt) => [receipt.conversation_id, receipt.last_read_at]));

  return (conversations ?? []).map((conversation) => ({
    ...conversation,
    latest_visitor_message_at: latestVisitorMessageByConversation.get(conversation.id) ?? null,
    last_read_at: readAtByConversation.get(conversation.id) ?? null,
  })) as SupportConversation[];
}

export async function markSupportConversationRead(conversationId: string, adminId: string) {
  const { error } = await supabaseAdmin
    .from("support_conversation_read_receipts")
    .upsert(
      { conversation_id: conversationId, admin_id: adminId, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,admin_id" },
    );

  if (error) throw new Error(error.message);
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
  update: Partial<Pick<SupportConversation, "assigned_agent_id" | "booking_id" | "customer_phone" | "customer_id" | "status" | "resolved_at" | "summary" | "summary_generated_at">>,
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

type SupportProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  country: string | null;
};

function normalizedPhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

async function memberMatchesFromProfiles(
  profiles: SupportProfileRow[],
  matchedBy: SupportMemberMatch["matchedBy"],
): Promise<SupportMemberMatch[]> {
  return Promise.all(profiles.map(async (profile) => {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (error) throw new Error(error.message);
    return {
      customerId: profile.id,
      name: `${profile.first_name} ${profile.last_name}`.trim(),
      email: data.user?.email ?? null,
      phone: profile.phone,
      country: profile.country,
      matchedBy,
    };
  }));
}

export async function findSupportMemberMatches(input: {
  customerId: string | null;
  phone: string | null;
  email: string | null;
}): Promise<SupportMemberMatch[]> {
  if (input.customerId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, phone, country")
      .eq("id", input.customerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return memberMatchesFromProfiles([data as SupportProfileRow], "conversation");

    const { data: userResult, error: userError } = await supabaseAdmin.auth.admin.getUserById(input.customerId);
    if (userError) throw new Error(userError.message);
    if (userResult.user) {
      return [{
        customerId: userResult.user.id,
        name: userResult.user.email ?? "Member",
        email: userResult.user.email ?? null,
        phone: null,
        country: null,
        matchedBy: "conversation",
      }];
    }
  }

  const phone = normalizedPhone(input.phone);
  if (phone) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, phone, country")
      .in("phone", [...new Set([input.phone?.trim() ?? "", phone])]);
    if (error) throw new Error(error.message);
    const exactPhoneMatches = ((data ?? []) as SupportProfileRow[])
      .filter((profile) => normalizedPhone(profile.phone) === phone);
    if (exactPhoneMatches.length > 0) return memberMatchesFromProfiles(exactPhoneMatches, "phone");
  }

  const email = input.email?.trim().toLowerCase();
  if (!email) return [];

  const { data: usersResult, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw new Error(usersError.message);
  const users = usersResult.users.filter((user) => user.email?.toLowerCase() === email);
  if (users.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, phone, country")
    .in("id", users.map((user) => user.id));
  if (profilesError) throw new Error(profilesError.message);
  const profileById = new Map(((profiles ?? []) as SupportProfileRow[]).map((profile) => [profile.id, profile]));

  return users.map((user) => {
    const profile = profileById.get(user.id);
    return {
      customerId: user.id,
      name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : (user.email ?? "Member"),
      email: user.email ?? null,
      phone: profile?.phone ?? null,
      country: profile?.country ?? null,
      matchedBy: "email" as const,
    };
  });
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
