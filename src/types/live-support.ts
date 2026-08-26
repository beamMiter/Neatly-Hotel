export type SupportConversationStatus = "waiting" | "active" | "resolved";
export type SupportMessageSender = "visitor" | "agent" | "system";
export type PhoneVerificationStatus = "not_requested" | "pending" | "verified";

export type SupportConversation = {
  id: string;
  visitor_token: string;
  customer_name: string | null;
  customer_phone: string | null;
  phone_verification_status: PhoneVerificationStatus;
  phone_verified_at: string | null;
  customer_id: string | null;
  booking_id: string | null;
  status: SupportConversationStatus;
  topic: string;
  assigned_agent_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  summary: string | null;
  summary_generated_at: string | null;
};

export type SupportMessage = {
  id: string;
  conversation_id: string;
  sender: SupportMessageSender;
  sender_name: string | null;
  content: string;
  created_at: string;
};

export type SupportAgent = {
  id: string;
  label: string;
};

export type SupportCustomer = {
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
};

export type SupportMemberMatch = SupportCustomer & {
  customerId: string;
  matchedBy: "conversation" | "phone" | "email";
};

export type SupportBooking = {
  id: string;
  bookingCode: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
};
