"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import type { ChatbotFaq, ChatbotFaqInput, ChatbotSettings } from "@/app/lib/chatbot-faq";

const emptyForm: ChatbotFaqInput = { question: "", answer: "", category: "General", keywords: [], is_active: true, sort_order: 0 };

export default function FaqManager({ initialFaqs, initialSettings, adminEmail, loadError }: { initialFaqs: ChatbotFaq[]; initialSettings: ChatbotSettings; adminEmail: string; loadError?: string }) {
  const router = useRouter();
  const [faqs, setFaqs] = useState(initialFaqs);
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<ChatbotFaqInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(loadError ? `Load failed: ${loadError}` : "");
  const [isSaving, setIsSaving] = useState(false);

  const filteredFaqs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? faqs.filter((faq) => [faq.question, faq.answer, faq.category, ...faq.keywords].some((value) => value.toLowerCase().includes(term))) : faqs;
  }, [faqs, query]);

  function editFaq(faq: ChatbotFaq) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, keywords: faq.keywords, is_active: faq.is_active, sort_order: faq.sort_order });
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const { data, error } = await createClient().from("chatbot_settings").update({ greeting_message: settings.greeting_message.trim(), auto_reply_message: settings.auto_reply_message.trim() }).eq("id", true).select().single();
    if (error || !data) setNotice(`Save failed: ${error?.message ?? "Settings not found"}`);
    else {
      setSettings(data);
      setNotice("Default chatbot messages saved.");
    }
    setIsSaving(false);
  }

  async function saveFaq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice("");
    const payload = { ...form, question: form.question.trim(), answer: form.answer.trim(), category: form.category.trim(), keywords: form.keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean) };
    const request = editingId ? createClient().from("chatbot_faqs").update(payload).eq("id", editingId).select().single() : createClient().from("chatbot_faqs").insert(payload).select().single();
    const { data, error } = await request;
    if (error || !data) setNotice(`Save failed: ${error?.message ?? "FAQ not found"}`);
    else {
      setFaqs((current) => editingId ? current.map((faq) => faq.id === editingId ? data : faq) : [...current, data].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
      resetForm();
      setNotice("Suggestion response saved.");
    }
    setIsSaving(false);
  }

  async function toggleFaq(faq: ChatbotFaq) {
    const { data, error } = await createClient().from("chatbot_faqs").update({ is_active: !faq.is_active }).eq("id", faq.id).select().single();
    if (error || !data) return setNotice(`Status update failed: ${error?.message ?? "FAQ not found"}`);
    setFaqs((current) => current.map((item) => item.id === faq.id ? data : item));
  }

  async function deleteFaq(faq: ChatbotFaq) {
    if (!window.confirm(`Delete “${faq.question}”?`)) return;
    const { error } = await createClient().from("chatbot_faqs").delete().eq("id", faq.id);
    if (error) return setNotice(`Delete failed: ${error.message}`);
    setFaqs((current) => current.filter((item) => item.id !== faq.id));
    if (editingId === faq.id) resetForm();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F6F7FC] text-[#2e3442]">
      <aside className="fixed top-0 left-0 z-30 flex h-screen w-[240px] flex-col border-r border-[#E4E6ED] bg-[#2F3E35] text-white max-lg:w-[76px] max-sm:hidden">
        <div className="grid gap-2 px-7 pt-8 pb-10 max-lg:px-3"><strong className="font-serif text-xl tracking-wide"><span className="font-sans text-sm text-[#e5673b]">+</span>NEATLY</strong><small className="text-[10px] text-[#aebdb5] max-lg:hidden">Admin Panel Control</small></div>
        <nav className="grid" aria-label="Admin navigation">
          <button className="flex min-h-[56px] items-center gap-3 px-7 text-left text-[11px] text-[#e3eae6] hover:bg-white/5 max-lg:hidden" type="button"><span className="w-4 text-center text-[#92aea0]">▣</span>Customer Booking</button>
          <button className="flex min-h-[56px] items-center gap-3 px-7 text-left text-[11px] text-[#e3eae6] hover:bg-white/5 max-lg:hidden" type="button"><span className="w-4 text-center text-[#92aea0]">▤</span>Room Management</button>
          <button className="flex min-h-[56px] items-center gap-3 px-7 text-left text-[11px] text-[#e3eae6] hover:bg-white/5 max-lg:hidden" type="button"><span className="w-4 text-center text-[#92aea0]">▥</span>Hotel Information</button>
          <button className="flex min-h-[56px] items-center gap-3 px-7 text-left text-[11px] text-[#e3eae6] hover:bg-white/5 max-lg:hidden" type="button"><span className="w-4 text-center text-[#92aea0]">◇</span>Room &amp; Property</button>
          <button className="flex min-h-[56px] items-center gap-3 px-7 text-left text-[11px] text-[#e3eae6] hover:bg-white/5 max-lg:hidden" type="button"><span className="w-4 text-center text-[#92aea0]">◷</span>Analytics Dashboard</button>
          <button className="flex min-h-[56px] items-center gap-3 bg-[#6d9180] px-7 text-left text-[11px] text-white max-lg:justify-center max-lg:px-2 max-lg:text-0" type="button"><span className="w-4 text-center">▱</span><span className="max-lg:hidden">Chatbot Setup</span></button>
        </nav>
        <button className="mt-auto flex min-h-[64px] items-center gap-3 border-t border-white/10 px-7 text-left text-[11px] text-[#e3eae6] max-lg:justify-center max-lg:px-2" type="button" onClick={signOut}><span className="text-[#92aea0]">↪</span><span className="max-lg:hidden">Log Out</span></button>
      </aside>

      <section className="ml-[240px] min-h-screen pt-[80px] max-lg:ml-[76px] max-sm:ml-0">
        <header className="fixed top-0 right-0 left-[240px] z-20 flex h-[80px] items-center justify-between gap-4 border-b border-[#E4E6ED] bg-white px-[60px] max-lg:left-[76px] max-lg:px-6 max-sm:left-0"><h1 className="m-0 text-[15px] font-semibold">Chatbot Setup</h1><span className="text-[10px] text-[#87908c]">{adminEmail}</span></header>
        <div className="min-h-[calc(100vh-80px)] bg-[#F6F7FC] px-[60px] pt-10 pb-20 max-lg:px-6 max-sm:px-3">
          <section className="max-w-[980px] border border-[#dfe2e8] bg-white px-[72px] py-[42px] max-md:px-5">
            <form className="grid gap-[22px]" onSubmit={saveSettings}>
              <h2 className="mb-2 text-[13px] font-medium text-[#7b87a8]">Default Chatbot Messages</h2>
              <label className="grid gap-2 text-[10px] text-[#414958]">Greeting message *<textarea className="w-full resize-y rounded-sm border border-[#cfd5df] bg-white px-3 py-2.5 leading-relaxed outline-none focus:border-[#729280] focus:ring-2 focus:ring-[#729280]/10" required rows={3} value={settings.greeting_message} onChange={(event) => setSettings({ ...settings, greeting_message: event.target.value })} /></label>
              <label className="grid gap-2 text-[10px] text-[#414958]">Auto-reply message *<textarea className="w-full resize-y rounded-sm border border-[#cfd5df] bg-white px-3 py-2.5 leading-relaxed outline-none focus:border-[#729280] focus:ring-2 focus:ring-[#729280]/10" required rows={3} value={settings.auto_reply_message} onChange={(event) => setSettings({ ...settings, auto_reply_message: event.target.value })} /></label>
              <button className="w-fit cursor-pointer rounded-sm bg-[#d24a18] px-5 py-3 text-[10px] text-white disabled:cursor-wait disabled:opacity-50" type="submit" disabled={isSaving}>Save Messages</button>
            </form>

            <div className="my-8 h-px bg-[#dfe3e9]" />

            <form className="grid gap-[22px]" onSubmit={saveFaq}>
              <div className="flex items-center justify-between gap-4"><h2 className="mb-2 text-[13px] font-medium text-[#7b87a8]">Suggestion menu &amp; Response</h2>{editingId && <span className="text-[10px] text-[#9b765f]">Editing #{editingId}</span>}</div>
              <div className="grid grid-cols-2 gap-[30px] max-md:grid-cols-1 max-md:gap-[18px]">
                <label className="grid gap-2 text-[10px] text-[#414958]">Topic *<input className="w-full rounded-sm border border-[#cfd5df] px-3 py-2.5 outline-none focus:border-[#729280] focus:ring-2 focus:ring-[#729280]/10" required minLength={3} maxLength={300} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} /></label>
                <label className="grid gap-2 text-[10px] text-[#414958]">Reply format<select className="w-full rounded-sm border border-[#cfd5df] bg-white px-3 py-2.5 outline-none" defaultValue="text"><option value="text">Text response</option></select></label>
              </div>
              <label className="grid gap-2 text-[10px] text-[#414958]">Response *<textarea className="w-full resize-y rounded-sm border border-[#cfd5df] px-3 py-2.5 leading-relaxed outline-none focus:border-[#729280] focus:ring-2 focus:ring-[#729280]/10" required minLength={3} maxLength={2000} rows={4} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} /></label>
              <div className="grid grid-cols-[.8fr_1.4fr_90px] gap-[30px] max-md:grid-cols-1 max-md:gap-[18px]">
                <label className="grid gap-2 text-[10px] text-[#414958]">Category<input className="w-full rounded-sm border border-[#cfd5df] px-3 py-2.5 outline-none" required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
                <label className="grid gap-2 text-[10px] text-[#414958]">Keywords<input className="w-full rounded-sm border border-[#cfd5df] px-3 py-2.5 outline-none" value={form.keywords.join(", ")} onChange={(event) => setForm({ ...form, keywords: event.target.value.split(",") })} placeholder="booking, room" /></label>
                <label className="grid gap-2 text-[10px] text-[#414958]">Order<input className="w-full rounded-sm border border-[#cfd5df] px-3 py-2.5 outline-none" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) || 0 })} /></label>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-[#414958]"><input className="h-3.5 w-3.5 accent-[#668b79]" type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Published</label>
              <div className="flex items-center gap-[22px]"><button className="cursor-pointer rounded-sm bg-[#d24a18] px-5 py-3 text-[10px] text-white disabled:cursor-wait disabled:opacity-50" type="submit" disabled={isSaving}>Save</button><button className="cursor-pointer bg-transparent px-3 py-3 text-[10px] text-[#4c5568]" type="button" onClick={resetForm}>Cancel</button></div>
            </form>

            {notice && <p className="mt-6 border-l-[3px] border-[#6f907f] bg-[#f2f6f3] px-3 py-2.5 text-[10px] text-[#587064]" role="status">{notice}</p>}

            <section className="mt-9 border-t border-[#e2e5ea] pt-7">
              <div className="mb-4 flex items-center justify-between gap-4 max-md:items-stretch max-md:flex-col"><div><h2 className="text-[13px] font-medium text-[#7b87a8]">Saved Suggestions</h2><small className="text-[9px] text-[#9da3ad]">{faqs.length} topics</small></div><input className="w-[190px] rounded-sm border border-[#cfd5df] px-3 py-2.5 text-[10px] outline-none max-md:w-full" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topic" /></div>
              {filteredFaqs.map((faq) => (
                <article className="flex items-start justify-between gap-5 border border-b-0 border-[#e3e6eb] p-4 last:border-b max-md:flex-col" key={faq.id}>
                  <div><strong className="text-[11px] text-[#3e4654]">{faq.question}</strong><p className="my-1 text-[10px] leading-relaxed text-[#727b8b]">{faq.answer}</p><small className="text-[8px] text-[#9ba2ac]">{faq.category} · Order {faq.sort_order}</small></div>
                  <div className="flex shrink-0 items-center gap-2"><button className={faq.is_active ? "cursor-pointer rounded-full bg-[#e2eee7] px-2 py-1 text-[9px] text-[#557566]" : "cursor-pointer bg-transparent p-1 text-[9px] text-[#657181]"} type="button" onClick={() => toggleFaq(faq)}>{faq.is_active ? "Published" : "Hidden"}</button><button className="cursor-pointer bg-transparent p-1 text-[9px] text-[#657181]" type="button" onClick={() => editFaq(faq)}>Edit</button><button className="cursor-pointer bg-transparent p-1 text-[9px] text-[#b15555]" type="button" onClick={() => deleteFaq(faq)}>Delete</button></div>
                </article>
              ))}
              {!filteredFaqs.length && <p className="p-6 text-center text-[10px] text-[#9299a5]">No suggestions found.</p>}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
