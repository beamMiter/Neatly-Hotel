"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    router.replace("/chatbot-setup");
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="admin-eyebrow">NEATLY HOTEL</p>
        <h1>เข้าสู่ระบบผู้ดูแล</h1>
        <p>จัดการคำถามและคำตอบของ Neatly Assistant</p>
        <label>อีเมล<input name="email" type="email" autoComplete="email" required /></label>
        <label>รหัสผ่าน<input name="password" type="password" autoComplete="current-password" required /></label>
        <p className="text-[11px] text-[#849088]">Mock login — กรอกอีเมลและรหัสผ่านใดก็ได้</p>
        <button type="submit" disabled={isLoading} className="cursor-pointer disabled:cursor-default">{isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        <Link href="/">กลับหน้าเว็บไซต์</Link>
      </form>
    </main>
  );
}
