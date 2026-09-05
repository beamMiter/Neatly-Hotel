export type SupportConversationStatus = "waiting" | "active" | "resolved";
export type SupportMessageSender = "visitor" | "agent" | "system";

export type SupportConversation = {
  id: string;
  visitor_token: string;
  customer_name: string | null;
  customer_phone: string | null;
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
  latest_visitor_message_at?: string | null;
  last_read_at?: string | null;
  latest_message_content?: string | null;
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

export type SupportBookingProposal = {
  roomTypeId: string;
  roomName: string;
  pricePerNight: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};

export type SupportBooking = {
  id: string;
  bookingCode: string;
  guestEmail: string;
  requiresEmailVerification: boolean;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  addonsTotal: number;
  specialRequests: SelectedSpecialRequest[];
};
import type { SelectedSpecialRequest } from "@/types/booking";
