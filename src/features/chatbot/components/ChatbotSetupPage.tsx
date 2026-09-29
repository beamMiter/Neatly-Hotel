import { createClient } from "@/server/db/supabase-server";
import { redirect } from "next/navigation";
import FaqManager from "@/features/chatbot/components/faq-manager";
import { getRoomTypeNames } from "@/server/queries/room-types.query";

export async function ChatbotSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("role, is_active")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();

  if (!staffMember) redirect("/login?error=access-denied");

  const [{ data: settings }, { data: suggestions }, roomTypes] = await Promise.all([
    supabase.from("chatbot_settings").select("*").eq("id", true).single(),
    supabase.from("chatbot_suggestions").select("*").order("sort_order"),
    getRoomTypeNames(),
  ]);

  return (
    <FaqManager
      initialSettings={settings ?? {
        id: true,
        greeting_message: "Welcome to Neatly Hotel!",
        auto_reply_message: "ขออภัยค่ะ ฉันยังไม่มีข้อมูลยืนยันสำหรับคำถามนี้",
        greeting_message_th: "สวัสดีค่ะ ยินดีต้อนรับสู่ Neatly Hotel!",
        greeting_message_en: "Welcome to Neatly Hotel!",
        auto_reply_message_th: "ขออภัยค่ะ ฉันยังไม่มีข้อมูลยืนยันสำหรับคำถามนี้",
        auto_reply_message_en: "Sorry, I do not have confirmed information for this question yet.",
        updated_at: "",
      }}
      initialSuggestions={suggestions ?? []}
      roomTypes={roomTypes}
    />
  );
}
