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

export async function listSupportConversations() {
  const { data, error } = await supabaseAdmin
    .from("support_conversations")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SupportConversation[];
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

type SupportBookingRow = {
  id: string;
  booking_code: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number | string;
  booking_rooms: { rooms: { room_type: string } | null }[] | null;
};

export async function listSupportBookings(conversation: SupportConversation): Promise<SupportBooking[]> {
  let request = supabaseAdmin
    .from("bookings")
    .select("id, booking_code, check_in, check_out, status, total_amount, booking_rooms(rooms(room_type))")
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
  }));
}
