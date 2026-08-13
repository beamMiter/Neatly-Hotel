"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (signInError) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setIsLoading(false);
      return;
    }

    router.replace("/admin/chatbot-faqs");
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="admin-eyebrow">NEATLY HOTEL</p>
        <h1>เข้าสู่ระบบผู้ดูแล</h1>
        <p>จัดการคำถามและคำตอบของ Neatly Assistant</p>
        <label>อีเมล<input name="email" type="email" autoComplete="email" required /></label>
        <label>รหัสผ่าน<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <button type="submit" disabled={isLoading}>{isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        <Link href="/">กลับหน้าเว็บไซต์</Link>
      </form>
    </main>
  );
}
