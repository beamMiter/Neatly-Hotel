import type { Metadata } from "next";
import { ChatbotSetupPage } from "@/features/chatbot/components/ChatbotSetupPage";

export const metadata: Metadata = {
  title: "Chatbot Setup | NEATLY Admin",
};

export default function Page() {
  return <ChatbotSetupPage />;
}
