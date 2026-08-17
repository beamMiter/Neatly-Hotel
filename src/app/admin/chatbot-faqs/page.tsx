import { createClient } from "@/app/lib/supabase/server";
import FaqManager from "./faq-manager";

export default async function ChatbotFaqAdminPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("chatbot_settings")
    .select("*")
    .eq("id", true)
    .single();

  return <FaqManager initialSettings={settings ?? { id: true, greeting_message: "Welcome to Neatly Hotel!", auto_reply_message: "ขออภัยค่ะ ฉันยังไม่เข้าใจคำถาม", updated_at: "" }} adminEmail="Mock Admin" />;
}
