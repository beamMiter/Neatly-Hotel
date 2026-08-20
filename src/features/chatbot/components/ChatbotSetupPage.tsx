import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import FaqManager from "@/app/admin/chatbot-faqs/faq-manager";

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

  const [{ data: settings }, { data: suggestions }] = await Promise.all([
    supabase.from("chatbot_settings").select("*").eq("id", true).single(),
    supabase.from("chatbot_suggestions").select("*").order("sort_order"),
  ]);

  return (
    <FaqManager
      initialSettings={settings ?? {
        id: true,
        greeting_message: "Welcome to Neatly Hotel!",
        auto_reply_message: "ขออภัยค่ะ ฉันยังไม่เข้าใจคำถาม",
        updated_at: "",
      }}
      initialSuggestions={suggestions ?? []}
    />
  );
}
