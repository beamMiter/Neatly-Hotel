import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import FaqManager from "./faq-manager";

export default async function ChatbotFaqAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("chatbot_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <p className="admin-eyebrow">ACCESS DENIED</p>
          <h1>บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล</h1>
          <p>โปรดให้เจ้าของโปรเจกต์เพิ่มบัญชีนี้ในตาราง chatbot_admins</p>
          <Link href="/admin/login">กลับหน้าเข้าสู่ระบบ</Link>
        </section>
      </main>
    );
  }

  const { data: faqs, error } = await supabase
    .from("chatbot_faqs")
    .select("*")
    .order("sort_order")
    .order("id");

  const { data: settings } = await supabase
    .from("chatbot_settings")
    .select("*")
    .eq("id", true)
    .single();

  return <FaqManager initialFaqs={faqs ?? []} initialSettings={settings ?? { id: true, greeting_message: "Welcome to Neatly Hotel!", auto_reply_message: "ขออภัยค่ะ ฉันยังไม่เข้าใจคำถาม", updated_at: "" }} adminEmail={user.email ?? "Admin"} loadError={error?.message} />;
}
