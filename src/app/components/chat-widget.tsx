"use client";

import Image from "next/image";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Room, SearchState } from "@/app/lib/hotel";

type Intent = "faq" | "search_room" | "unknown";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: Intent;
  rooms?: Room[];
};

type ChatResponse = {
  message?: string;
  error?: string;
  intent?: Intent;
  search?: SearchState;
  rooms?: Room[];
};

const initialSearch: SearchState = {
  checkIn: null,
  checkOut: null,
  guests: null,
  budget: null,
};

const defaultGreeting = "Welcome to Neatly Hotel! 🌟\nI’m your virtual assistant.\nChoose a topic you’d like to know more about. I’m here to help! 😊";

const topicReplies = [
  { label: "Room Types", message: "แนะนำประเภทห้องพักให้หน่อย" },
  { label: "Booking", message: "ฉันต้องการจองห้องพัก" },
  { label: "Check-in & Check-out Time", message: "เวลาเช็กอินและเช็กเอาต์คือกี่โมง" },
  { label: "Payment Methods", message: "โรงแรมรองรับช่องทางชำระเงินอะไรบ้าง" },
  { label: "Cancel Booking", message: "ขอข้อมูลการยกเลิกการจอง" },
  { label: "Promotion", message: "ตอนนี้โรงแรมมีโปรโมชันอะไรบ้าง" },
];

export default function ChatWidget({ greetingMessage = defaultGreeting }: { greetingMessage?: string }) {
  const initialMessage: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content: greetingMessage,
  };
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [search, setSearch] = useState<SearchState>(initialSearch);
  const [filterSearch, setFilterSearch] = useState<SearchState>(initialSearch);
  const [view, setView] = useState<"chat" | "filter">("chat");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function sendMessage(text: string, searchOverride: SearchState = search) {
    const content = text.trim();
    if (!content || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          search: searchOverride,
        }),
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok) throw new Error(data.error ?? "ส่งข้อความไม่สำเร็จ");

      if (data.search) setSearch(data.search);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message ?? "ขออภัยค่ะ ไม่พบคำตอบ",
          intent: data.intent,
          rooms: data.rooms,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้งนะคะ",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function showRoomDetails(room: Room) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `${room.name}\n${room.description}\n${room.size} · ${room.bed} · รองรับ ${room.capacity} ท่าน\nราคา ${room.price.toLocaleString("th-TH")} บาทต่อคืน`,
      },
    ]);
  }

  function startBooking(room: Room) {
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: `ต้องการจอง ${room.name}` },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `รับทราบค่ะ คุณเลือก ${room.name}\nนี่เป็นระบบทดลอง จึงยังไม่ยืนยันการจองหรือรับชำระเงิน กรุณาฝากชื่อและช่องทางติดต่อเพื่อให้เจ้าหน้าที่ดำเนินการต่อค่ะ`,
      },
    ]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filterSearch.checkIn || !filterSearch.checkOut || !filterSearch.guests || !filterSearch.budget) return;

    setView("chat");
    setSearch(filterSearch);
    void sendMessage(
      `ค้นหาห้องพัก ${filterSearch.checkIn} ถึง ${filterSearch.checkOut}, ${filterSearch.guests} คน, งบ ${filterSearch.budget} บาท`,
      filterSearch,
    );
  }

  function handleBack() {
    if (view === "filter") {
      setView("chat");
      return;
    }

    if (messages.length === 1) {
      setIsOpen(false);
      return;
    }

    setMessages([initialMessage]);
    setSearch(initialSearch);
    setFilterSearch(initialSearch);
    setInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  const hasSearchProgress = Object.values(search).some(Boolean);

  return (
    <aside className="fixed right-2 bottom-2 z-50 sm:right-[18px] sm:bottom-[18px]" aria-label="ผู้ช่วย Neatly Hotel">
      {isOpen && (
        <section className="flex h-[min(1008px,calc(100dvh-16px))] w-[min(375px,calc(100vw-16px))] flex-col overflow-hidden border border-[#E4E6ED] bg-[#F7F7FB] shadow-[0_22px_70px_rgba(34,40,58,.2)]" aria-live="polite">
          <header className="flex h-[60px] min-h-[60px] items-center justify-between border-b border-[#E4E6ED] bg-white pl-4">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F1F5F3] p-1 shadow-[4px_4px_16px_rgba(0,0,0,.08)]">
                <svg className="h-8 w-8" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="9" fill="#DFE9E3"/><path d="M8 10h18v13H15l-5 4v-4H8V10Z" fill="#658477"/><path d="M12 14h10M12 18h7" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M26 4v7M22.5 7.5h7" stroke="#E65B2E" strokeWidth="2"/></svg>
              </div>
              <h2 className="truncate text-xl leading-[30px] font-semibold tracking-[-.02em] text-[#2A2E3F]">Neatly Assistant</h2>
            </div>
            <button className="grid h-[60px] w-[60px] shrink-0 cursor-pointer place-items-center border-0 bg-transparent text-[#646D89]" type="button" onClick={() => setIsOpen(false)} aria-label="ปิดหน้าต่างแชต">
              <svg className="h-6 w-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19" /></svg>
            </button>
          </header>

          {(view === "filter" || messages.length > 1) && (
            <nav className="flex min-h-[38px] items-center justify-between border-b border-[#ececf1] bg-white px-4" aria-label="การนำทางแชต">
              <button className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[11px] text-[#69738b]" type="button" onClick={handleBack}>
                <svg className="w-[15px] fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                Back
              </button>
              <span className="text-[10px] text-[#9398a7]">{view === "filter" ? "Booking" : "Conversation"}</span>
            </nav>
          )}

          {view === "chat" && hasSearchProgress && (
            <div className="flex gap-1.5 overflow-x-auto border-b border-[#e4e8e4] bg-[#f0f3f1] px-3 py-2 text-[10px] text-[#60766a]" aria-label="ข้อมูลค้นหาห้องพัก">
              {search.checkIn && <span className="shrink-0 rounded-full border border-[#cbd7cf] bg-white px-2 py-1">เข้า {search.checkIn}</span>}
              {search.checkOut && <span className="shrink-0 rounded-full border border-[#cbd7cf] bg-white px-2 py-1">ออก {search.checkOut}</span>}
              {search.guests && <span className="shrink-0 rounded-full border border-[#cbd7cf] bg-white px-2 py-1">{search.guests} ท่าน</span>}
              {search.budget && <span className="shrink-0 rounded-full border border-[#cbd7cf] bg-white px-2 py-1">≤ {search.budget.toLocaleString("th-TH")} บาท</span>}
            </div>
          )}

          {view === "chat" ? (
          <div className="isolate flex min-h-0 w-full flex-1 flex-col justify-start gap-4 overflow-y-auto bg-[radial-gradient(circle_at_88%_22%,rgba(224,226,237,.72)_0_90px,transparent_91px),radial-gradient(ellipse_at_8%_82%,rgba(235,236,243,.9)_0_85px,transparent_86px)] bg-[#F7F7FB] px-4 py-6" ref={scrollAreaRef}>
            {messages.map((message) => (
              <div key={message.id} className="w-full">
                <div className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p className={`m-0 max-w-[255px] whitespace-pre-line rounded-lg px-4 py-2 text-base leading-6 tracking-[-.02em] ${message.role === "user" ? "bg-[#C14817] text-white" : "bg-white text-[#646D89]"}`}>{message.content}</p>
                </div>
                {!!message.rooms?.length && (
                  <div className="relative z-[1] -mr-4 mt-4 flex snap-x gap-[9px] overflow-x-auto pr-4 pb-2">
                    {message.rooms.map((room, index) => (
                      <article className="h-[317px] w-[255px] min-w-[255px] snap-start overflow-hidden rounded-lg bg-white shadow-[0_5px_18px_rgba(52,61,78,.08)]" key={room.id}>
                        <div className={`h-[155px] bg-cover bg-center ${index % 3 === 0 ? "bg-[linear-gradient(155deg,transparent_0_30%,rgba(52,74,65,.25)_31%),linear-gradient(18deg,#ccb28e_0_28%,#e7edf2_29%_62%,#98b6c9_63%)]" : index % 3 === 1 ? "bg-[linear-gradient(90deg,rgba(81,68,57,.72)_0_24%,transparent_25%),linear-gradient(160deg,#d9d3ca_0_45%,#f2eee8_46%_70%,#a5b6bd_71%)]" : "bg-[linear-gradient(25deg,#8eaa94_0_26%,transparent_27%),linear-gradient(150deg,#e9d5b8_0_48%,#bfd4e0_49%)]"}`} role="img" aria-label={`ภาพห้อง ${room.name}`} />
                        <div className="flex h-[122px] flex-col justify-center gap-1.5 px-4 pt-2.5 pb-4">
                          <div>
                            <h3 className="m-0 text-base leading-6 font-semibold tracking-[-.02em] text-[#2A2E3F]">{room.name}</h3>
                            <p className="m-0 text-base leading-6 font-semibold tracking-[-.02em] text-[#E76B39]">THB {room.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                          </div>
                          <p className="m-0 line-clamp-2 min-h-[42px] text-sm leading-[21px] font-medium tracking-[-.02em] text-[#9AA1B9]">{room.size} with {room.bed.toLowerCase()}, bathroom and space for {room.capacity} guests. {room.description}</p>
                        </div>
                        <div className="grid h-10 grid-cols-2 bg-[#FAEDE8]">
                          <button className="flex cursor-pointer items-center justify-between border-0 border-r border-[#f1ddd5] bg-transparent px-4 text-base leading-4 font-semibold text-[#E76B39]" type="button" onClick={() => showRoomDetails(room)}>Details <span className="text-2xl font-light" aria-hidden="true">›</span></button>
                          <button className="cursor-pointer border-0 bg-[#C14817] px-3 text-sm font-semibold text-white" type="button" onClick={() => startBooking(room)}>Book Now</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 1 && (
              <div className="relative z-[1] w-full">
                <div className="flex flex-wrap gap-2" aria-label="หัวข้อยอดนิยม">
                  {topicReplies.map((topic) => (
                    <button className="h-10 w-auto cursor-pointer rounded-full border border-[#ABC0B4] bg-[#E6EBE9] px-4 text-left text-base leading-6 tracking-[-.02em] text-[#465C50] hover:border-[#7fa08f] hover:bg-[#dce6e1] focus:outline-2 focus:outline-[#849b8c]"
                      key={topic.label}
                      type="button"
                      onClick={() => topic.label === "Booking" ? setView("filter") : void sendMessage(topic.message)}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="flex gap-1 rounded-[9px] bg-white px-[15px] py-[13px]" aria-label="กำลังพิมพ์"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98a59e]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98a59e] [animation-delay:.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98a59e] [animation-delay:.3s]" /></div>
              </div>
            )}
          </div>
          ) : (
            <div className="isolate flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto bg-[#F7F7FB] px-5 py-6">
              <div className="flex items-center gap-3">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-[#e6eee8] text-[22px] text-[#698172]">⌕</span>
                <div><h3 className="m-0 text-[17px] text-[#3e5046]">ค้นหาห้องพัก</h3><p className="m-0 text-[10px] text-[#89928d]">ระบุรายละเอียดเพื่อดูห้องที่เหมาะกับคุณ</p></div>
              </div>
              <form className="grid gap-3 rounded-[15px] border border-[#e0e5e1] bg-white p-[15px] shadow-[0_4px_14px_rgba(35,45,40,.05)]" onSubmit={handleFilterSubmit}>
                <label className="grid gap-1 text-[10px] text-[#5e6e65]">
                  <span>วันเช็กอิน</span>
                  <input className="w-full rounded-[9px] border border-[#dce2de] bg-white px-[10px] py-[9px] text-[11px] text-[#3f4d45] outline-none focus:border-[#8ba092] focus:ring-2 focus:ring-[#849b8c]/15" type="date" required value={filterSearch.checkIn ?? ""} onChange={(event) => setFilterSearch((current) => ({ ...current, checkIn: event.target.value || null }))} />
                </label>
                <label className="grid gap-1 text-[10px] text-[#5e6e65]">
                  <span>วันเช็กเอาต์</span>
                  <input className="w-full rounded-[9px] border border-[#dce2de] bg-white px-[10px] py-[9px] text-[11px] text-[#3f4d45] outline-none focus:border-[#8ba092] focus:ring-2 focus:ring-[#849b8c]/15" type="date" required value={filterSearch.checkOut ?? ""} onChange={(event) => setFilterSearch((current) => ({ ...current, checkOut: event.target.value || null }))} />
                </label>
                <div className="grid grid-cols-2 gap-[9px]">
                  <label className="grid gap-1 text-[10px] text-[#5e6e65]">
                    <span>ผู้เข้าพัก</span>
                    <select className="min-w-0 rounded-[9px] border border-[#dce2de] bg-white px-[10px] py-[9px] text-[11px] text-[#3f4d45]" required value={filterSearch.guests ?? ""} onChange={(event) => setFilterSearch((current) => ({ ...current, guests: Number(event.target.value) || null }))}>
                      <option value="">เลือก</option>
                      {[1, 2, 3, 4, 5, 6].map((guests) => <option key={guests} value={guests}>{guests} ท่าน</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[10px] text-[#5e6e65]">
                    <span>งบต่อคืน</span>
                    <input className="min-w-0 rounded-[9px] border border-[#dce2de] bg-white px-[10px] py-[9px] text-[11px] text-[#3f4d45]" type="number" required min="1000" step="100" placeholder="เช่น 4000" value={filterSearch.budget ?? ""} onChange={(event) => setFilterSearch((current) => ({ ...current, budget: Number(event.target.value) || null }))} />
                  </label>
                </div>
                <button className="cursor-pointer rounded-[9px] border-0 bg-[#829a8b] p-[11px] text-[11px] font-semibold text-white hover:bg-[#71897a]" type="submit">ค้นหาห้องว่าง</button>
              </form>
              <button className="w-full cursor-pointer border-0 bg-transparent text-[10px] text-[#718779] underline underline-offset-3" type="button" onClick={() => setView("chat")}>ต้องการให้บอตช่วยแนะนำ? ค้นหาผ่านแชต</button>
            </div>
          )}

          {view === "chat" && (
          <form className="flex h-[67.33px] min-h-[67.33px] w-full items-center gap-2 bg-white px-4 pt-2 pb-6 shadow-[0_-8px_12px_6px_rgba(0,0,0,.05)]" onSubmit={handleSubmit}>
            <textarea className="h-[35.33px] min-h-[35.33px] w-[311px] flex-1 resize-none rounded-[16.9952px] border-0 bg-white px-2 py-[5.665px] text-base leading-6 tracking-[-.02em] text-[#42495e] outline-none placeholder:text-[#9AA1B9]"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={800}
              placeholder="Write your message"
              aria-label="ข้อความ"
            />
            <button className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center border-0 bg-transparent disabled:cursor-default disabled:opacity-60" type="submit" disabled={!input.trim() || isLoading} aria-label="ส่งข้อความ">
              <svg className="h-6 w-6 -rotate-[8deg] fill-[#E76B39]" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 20 18-8L3 4v6l13 2-13 2v6Z" /></svg>
            </button>
          </form>
          )}
        </section>
      )}

      <button
        className={`${isOpen ? "hidden" : "grid"} h-[88px] w-[88px] cursor-pointer place-items-center rounded-full border-0 bg-transparent transition-transform hover:-translate-y-1 max-sm:h-[76px] max-sm:w-[76px]`}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "ปิดแชต" : "เปิดแชตกับ Neatly Hotel"}
      >
        <Image className="h-full w-full object-contain" src="/chat-fab.png" alt="" width={89} height={89} priority />
      </button>
    </aside>
  );
}
