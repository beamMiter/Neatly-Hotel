import type { ChatbotRoomResult, ChatbotSuggestion } from "@/types/chatbot";
import type { SpecialRequestOption } from "@/types/booking";
import type { SupportBooking, SupportConversation } from "@/types/live-support";

export type Intent = "faq" | "search_room" | "unknown";
export type WidgetLocale = "th" | "en";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: Intent;
  rooms?: ChatbotRoomResult[];
  suggestion?: ChatbotSuggestion;
};

export type SupportMessageResponse = {
  id: string;
  sender: "visitor" | "agent" | "system";
  content: string;
  created_at: string;
};

export type SupportSessionResponse = {
  conversation: Pick<SupportConversation, "id" | "status" | "assigned_agent_id" | "booking_id"> | null;
  messages: SupportMessageResponse[];
  booking?: SupportBooking | null;
  specialRequestOptions?: SpecialRequestOption[];
};
