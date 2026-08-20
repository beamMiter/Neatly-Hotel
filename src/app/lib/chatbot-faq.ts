export type ChatbotFaq = {
  id: number;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ChatbotFaqInput = Pick<
  ChatbotFaq,
  "question" | "answer" | "category" | "keywords" | "is_active" | "sort_order"
>;

export type ChatbotSettings = {
  id: boolean;
  greeting_message: string;
  auto_reply_message: string;
  updated_at: string;
};

export type ChatbotSuggestionFormat = "Room type" | "Message" | "Option with details";

export type ChatbotSuggestionOption = {
  name: string;
  details: string;
};

export type ChatbotSuggestion = {
  id: string;
  topic: string;
  format: ChatbotSuggestionFormat;
  reply: string;
  button_name: string | null;
  rooms: string[];
  options: ChatbotSuggestionOption[];
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};
