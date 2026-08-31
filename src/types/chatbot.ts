export type ChatbotSettings = {
  id: boolean;
  greeting_message: string;
  auto_reply_message: string;
  greeting_message_th: string;
  greeting_message_en: string;
  auto_reply_message_th: string;
  auto_reply_message_en: string;
  updated_at: string;
};

export type ChatbotSuggestionFormat = "Room type" | "Message" | "Option with details";

export type ChatbotSuggestionOption = {
  name: string;
  details: string;
};

export type ChatbotSuggestionTranslation = {
  topic: string;
  reply: string;
  button_name: string | null;
  options: ChatbotSuggestionOption[];
};

export type ChatbotSuggestion = {
  id: string;
  topic: string;
  format: ChatbotSuggestionFormat;
  reply: string;
  button_name: string | null;
  rooms: string[];
  options: ChatbotSuggestionOption[];
  translations?: Partial<Record<"th" | "en", ChatbotSuggestionTranslation>>;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ChatbotSearchPhase = "idle" | "collecting" | "results";

export type ChatbotSearchState = {
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  budget: number | null;
  phase: ChatbotSearchPhase;
};

export type ChatbotSearchField = Exclude<keyof ChatbotSearchState, "phase">;

export type ChatbotRoomResult = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  size: string;
  bed: string;
  available: boolean;
  imageUrl: string | null;
  amenities: string[];
  detailHref: string;
};
export type ChatbotEventType = "response" | "handoff";
export type ChatbotResponseMode = "managed_suggestion" | "room_information" | "gemini" | "gemini_fallback" | "demo";

export type ChatbotEventInput = {
  requestId: string;
  eventType: ChatbotEventType;
  intent: "faq" | "search_room" | "unknown";
  responseMode: ChatbotResponseMode;
  fallbackReason: string | null;
  handoffReason: string | null;
  messageRedacted: string | null;
};
