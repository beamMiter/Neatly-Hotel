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
