"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { ChatbotRoomResult, ChatbotSearchState, ChatbotSuggestion } from "@/types/chatbot";

type Intent = "faq" | "search_room" | "unknown";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: Intent;
  rooms?: ChatbotRoomResult[];
  suggestion?: ChatbotSuggestion;
};

type ChatResponse = {
  message?: string;
  error?: string;
  intent?: Intent;
  search?: ChatbotSearchState;
  rooms?: ChatbotRoomResult[];
  suggestion?: ChatbotSuggestion;
};

type SupportMessageResponse = {
  id: string;
  sender: "visitor" | "agent" | "system";
  content: string;
  created_at: string;
};

const initialSearch: ChatbotSearchState = {
  checkIn: null,
  checkOut: null,
  guests: null,
  budget: null,
};

const defaultGreeting = "Welcome to Neatly Hotel! 🌟\nI’m your virtual assistant.\nChoose a topic you’d like to know more about. I’m here to help! 😊";

export default function ChatWidget({ greetingMessage = defaultGreeting, suggestions = [] }: { greetingMessage?: string; suggestions?: ChatbotSuggestion[] }) {
  const initialMessage: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content: greetingMessage,
  };
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [search, setSearch] = useState<ChatbotSearchState>(initialSearch);
  const [filterSearch, setFilterSearch] = useState<ChatbotSearchState>(initialSearch);
  const [view, setView] = useState<"chat" | "filter">("chat");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequestedLiveSupport, setHasRequestedLiveSupport] = useState(false);
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [isCollectingPhone, setIsCollectingPhone] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
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

  useEffect(() => {
    if (!hasRequestedLiveSupport || !visitorToken) return;

    let cancelled = false;
    const loadAgentReplies = async () => {
      try {
        const response = await fetch(`/api/live-support/visitor?visitorToken=${visitorToken}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { messages?: SupportMessageResponse[] };
        const agentMessages = (data.messages ?? []).filter((message) => message.sender !== "visitor");

        if (!cancelled && agentMessages.length > 0) {
          setMessages((current) => {
            const knownIds = new Set(current.map((message) => message.id));
            const replies = agentMessages
              .filter((message) => !knownIds.has(message.id))
              .map((message) => ({
                id: message.id,
                role: "assistant" as const,
                content: message.content,
              }));
            return replies.length > 0 ? [...current, ...replies] : current;
          });
        }
      } catch {
        // A later polling interval retries transient network failures.
      }
    };

    void loadAgentReplies();
    const intervalId = window.setInterval(() => void loadAgentReplies(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hasRequestedLiveSupport, visitorToken]);

  async function sendMessage(text: string, searchOverride: ChatbotSearchState = search, suggestionId?: string) {
    const content = text.trim();
    if (!content || isLoading) return;

    if (hasRequestedLiveSupport && visitorToken) {
      await sendLiveSupportMessage(content);
      return;
    }

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
          suggestionId,
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
          suggestion: data.suggestion,
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

  function startBooking(room: ChatbotRoomResult) {
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

  function requestLiveSupport() {
    if (isLoading || hasRequestedLiveSupport || isCollectingPhone) return;

    setIsCollectingPhone(true);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "เพื่อให้เจ้าหน้าที่ติดต่อกลับได้ กรุณากรอกเบอร์โทรศัพท์ของคุณก่อนค่ะ",
      },
    ]);
  }

  function startLiveSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = contactPhone.trim();
    const digits = phone.replace(/\D/g, "");
    if (phone && (digits.length < 7 || digits.length > 15)) return;

    const savedToken = window.localStorage.getItem("neatly-live-support-token");
    const token = savedToken ?? crypto.randomUUID();
    if (!savedToken) window.localStorage.setItem("neatly-live-support-token", token);

    setIsLoading(true);
    void fetch("/api/live-support/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorToken: token,
        contactPhone: phone || null,
        content: "ต้องการพูดคุยกับเจ้าหน้าที่ Live Support",
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to start live support");
        const data = (await response.json()) as { message: SupportMessageResponse };
        setVisitorToken(token);
        setHasRequestedLiveSupport(true);
        setIsCollectingPhone(false);
        setMessages((current) => [
          ...current,
          {
            id: data.message.id,
            role: "user",
            content: "ต้องการพูดคุยกับเจ้าหน้าที่ Live Support",
          },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "เชื่อมต่อกับเจ้าหน้าที่แล้วค่ะ พิมพ์รายละเอียดที่ต้องการความช่วยเหลือได้เลย",
          },
        ]);
      })
      .catch(() => {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "ไม่สามารถเชื่อมต่อเจ้าหน้าที่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้งค่ะ",
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }

  async function sendLiveSupportMessage(content: string) {
    if (!visitorToken) return;

    const messageId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: messageId, role: "user", content },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/live-support/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorToken, content }),
      });
      if (!response.ok) throw new Error("Unable to send support message");
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
    setHasRequestedLiveSupport(false);
    setIsCollectingPhone(false);
    setContactPhone("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  const hasSearchProgress = Object.values(search).some(Boolean);
  const completedUserTurns = messages.filter((message) => message.role === "user").length;
  const hasUnresolvedQuestion = messages.some(
    (message) => message.role === "assistant" && message.intent === "unknown",
  );
  const shouldOfferLiveSupport =
    !hasRequestedLiveSupport && !isCollectingPhone && (completedUserTurns >= 3 || hasUnresolvedQuestion);

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
                        <div className={`relative h-[155px] overflow-hidden bg-cover bg-center ${index % 3 === 0 ? "bg-[linear-gradient(155deg,transparent_0_30%,rgba(52,74,65,.25)_31%),linear-gradient(18deg,#ccb28e_0_28%,#e7edf2_29%_62%,#98b6c9_63%)]" : index % 3 === 1 ? "bg-[linear-gradient(90deg,rgba(81,68,57,.72)_0_24%,transparent_25%),linear-gradient(160deg,#d9d3ca_0_45%,#f2eee8_46%_70%,#a5b6bd_71%)]" : "bg-[linear-gradient(25deg,#8eaa94_0_26%,transparent_27%),linear-gradient(150deg,#e9d5b8_0_48%,#bfd4e0_49%)]"}`} role="img" aria-label={`ภาพห้อง ${room.name}`}>
                          {room.imageUrl && <Image src={room.imageUrl} alt={room.name} fill className="object-cover" sizes="255px" />}
                        </div>
                        <div className="flex h-[122px] flex-col justify-center gap-1.5 px-4 pt-2.5 pb-4">
                          <div>
                            <h3 className="m-0 text-base leading-6 font-semibold tracking-[-.02em] text-[#2A2E3F]">{room.name}</h3>
                            <p className="m-0 text-base leading-6 font-semibold tracking-[-.02em] text-[#E76B39]">THB {room.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                          </div>
                          <p className="m-0 line-clamp-2 min-h-[42px] text-sm leading-[21px] font-medium tracking-[-.02em] text-[#9AA1B9]">{room.size} with {room.bed.toLowerCase()}, bathroom and space for {room.capacity} guests. {room.description}</p>
                        </div>
                        <div className="grid h-10 grid-cols-2 bg-[#FAEDE8]">
                          <Link className="flex cursor-pointer items-center justify-between border-r border-[#f1ddd5] bg-transparent px-4 text-base leading-4 font-semibold text-[#E76B39]" href={room.detailHref}>Details <span className="text-2xl font-light" aria-hidden="true">›</span></Link>
                          <button className="cursor-pointer border-0 bg-[#C14817] px-3 text-sm font-semibold text-white" type="button" onClick={() => startBooking(room)}>Book Now</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {message.suggestion?.format === "Option with details" && message.suggestion.options.length > 0 && (
                  <div className="mt-3 grid max-w-[300px] gap-2">
                    {message.suggestion.options.map((option) => (
                      <details className="rounded-lg border border-[#DDE3E0] bg-white px-4 py-2 text-[#646D89]" key={option.name}>
                        <summary className="cursor-pointer font-semibold text-[#465C50]">{option.name}</summary>
                        <p className="mt-2 text-sm leading-5">{option.details}</p>
                      </details>
                    ))}
                  </div>
                )}
                {message.suggestion?.format === "Room type" && message.suggestion.rooms.length > 0 && (
                  <div className="mt-3 flex max-w-[320px] flex-wrap gap-2">
                    {message.suggestion.rooms.map((room) => (
                      <button className="rounded-full border border-[#ABC0B4] bg-white px-3 py-2 text-sm text-[#465C50]" key={room} type="button" onClick={() => message.suggestion?.id === "booking" ? setView("filter") : void sendMessage(room)}>
                        {room}{message.suggestion?.button_name ? ` · ${message.suggestion.button_name}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 1 && (
              <div className="relative z-[1] w-full">
                <div className="flex flex-wrap gap-2" aria-label="หัวข้อยอดนิยม">
                  {suggestions.map((topic) => (
                    <button className="h-10 w-auto cursor-pointer rounded-full border border-[#ABC0B4] bg-[#E6EBE9] px-4 text-left text-base leading-6 tracking-[-.02em] text-[#465C50] hover:border-[#7fa08f] hover:bg-[#dce6e1] focus:outline-2 focus:outline-[#849b8c]"
                      key={topic.id}
                      type="button"
                      onClick={() => void sendMessage(topic.topic, search, topic.id)}
                    >
                      {topic.topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {shouldOfferLiveSupport && (
              <div className="relative z-[1] w-full rounded-xl border border-[#F3C7B8] bg-[#FFF8F5] p-3">
                <p className="m-0 text-sm font-medium text-[#7B472F]">
                  ยังต้องการความช่วยเหลือเพิ่มเติมไหม?
                </p>
                <button
                  className="mt-2 flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[#C14817] bg-white px-4 text-left text-sm font-medium text-[#B84214] hover:bg-[#FCE5DA] focus:outline-2 focus:outline-[#C14817]"
                  type="button"
                  onClick={requestLiveSupport}
                >
                  <svg className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 18.5 3.5 21l3.6-1.1A8.5 8.5 0 1 0 3.5 13" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                  คุยกับเจ้าหน้าที่
                </button>
              </div>
            )}
            {isCollectingPhone && (
              <form className="relative z-[1] w-full rounded-xl border border-[#F3C7B8] bg-[#FFF8F5] p-3" onSubmit={startLiveSupport}>
                <label className="grid gap-2 text-sm font-medium text-[#7B472F]">
                  เบอร์โทรศัพท์สำหรับติดต่อกลับ (ไม่บังคับ)
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="เช่น 081 234 5678"
                    className="h-10 rounded-lg border border-[#E8B8A5] bg-white px-3 text-base text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] focus:border-[#C14817] focus:ring-2 focus:ring-[#C14817]/15"
                    required
                  />
                </label>
                <button
                  className="mt-3 h-10 w-full rounded-lg bg-[#C14817] text-sm font-semibold text-white hover:bg-[#A93910] disabled:cursor-default disabled:opacity-60"
                  type="submit"
                  disabled={isLoading}
                >
                  เริ่มคุยกับเจ้าหน้าที่
                </button>
              </form>
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
              disabled={isCollectingPhone}
            />
            <button className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center border-0 bg-transparent disabled:cursor-default disabled:opacity-60" type="submit" disabled={!input.trim() || isLoading || isCollectingPhone} aria-label="ส่งข้อความ">
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
