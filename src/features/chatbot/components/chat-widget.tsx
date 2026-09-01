"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import BookingSearch from "@/components/shared/BookingSearch";
import { buildBookingHref } from "@/features/booking-flow/utils";
import { ChatMessageList } from "@/features/chatbot/components/ChatMessageList";
import { isBookingConfirmationMessage } from "@/features/chatbot/components/support-booking-card";
import type { ChatMessage, Intent, SupportSessionResponse, WidgetLocale } from "@/features/chatbot/components/chat-widget.types";
import { useLiveSupportVisitor } from "@/features/chatbot/components/useLiveSupportVisitor";
import type { ChatbotRoomResult, ChatbotSearchState, ChatbotSuggestion } from "@/types/chatbot";

type ChatResponse = {
  message?: string;
  error?: string;
  intent?: Intent;
  search?: ChatbotSearchState;
  rooms?: ChatbotRoomResult[];
  suggestion?: ChatbotSuggestion;
};


const CHATBOT_LOCALE_KEY = "neatly-chatbot-locale";

const widgetCopy: Record<WidgetLocale, Record<string, string>> = {
  th: { back: "ย้อนกลับ", reset: "เริ่มแชทใหม่", booking: "การจอง", conversation: "บทสนทนา", checkIn: "เข้า", checkOut: "ออก", guests: "ท่าน", budget: "บาท", bookNow: "จองเลย", viewDetails: "ดูรายละเอียด", retry: "ลองถามใหม่", liveSupport: "คุยกับเจ้าหน้าที่", helpRoom: "ต้องการให้เจ้าหน้าที่ช่วยแนะนำห้องนี้ไหม?", help: "ยังต้องการความช่วยเหลือเพิ่มเติมไหม?", phone: "เบอร์โทรศัพท์สำหรับติดต่อกลับ (ไม่บังคับ)", phonePrompt: "หากต้องการให้เจ้าหน้าที่ติดต่อกลับ สามารถกรอกเบอร์โทรศัพท์ได้ (ไม่บังคับ)", phoneExample: "เช่น 081 234 5678", startSupport: "เริ่มคุยกับเจ้าหน้าที่", supportRequest: "ต้องการพูดคุยกับเจ้าหน้าที่ Live Support", otp: "รหัสยืนยันจาก SMS", otpPlaceholder: "กรอกรหัส OTP", verifyPhone: "ยืนยันเบอร์โทรศัพท์", typing: "กำลังพิมพ์", messagePlaceholder: "พิมพ์ข้อความ", close: "ปิดหน้าต่างแชท", open: "เปิดแชทกับ Neatly Hotel" },
  en: { back: "Back", reset: "Reset chat", booking: "Booking", conversation: "Conversation", checkIn: "Check-in", checkOut: "Check-out", guests: "guests", budget: "THB", bookNow: "Book Now", viewDetails: "View Details", retry: "Ask again", liveSupport: "Talk to an agent", helpRoom: "Would you like an agent to help with this room?", help: "Do you need more help?", phone: "Phone number for a callback (optional)", phonePrompt: "Enter a phone number if you would like an agent to call you back (optional).", phoneExample: "e.g. 081 234 5678", startSupport: "Start live support", supportRequest: "I would like to speak with a live support agent.", otp: "SMS verification code", otpPlaceholder: "Enter the OTP", verifyPhone: "Verify phone number", typing: "Typing", messagePlaceholder: "Write your message", close: "Close chat", open: "Open chat with Neatly Hotel" },
};

function supportStatusLabel(conversation: SupportSessionResponse["conversation"], locale: WidgetLocale) {
  if (!conversation) return null;
  if (conversation.status === "resolved") return locale === "th" ? "ปิดการสนทนาแล้ว" : "Resolved";
  if (conversation.status === "active" || conversation.assigned_agent_id) return locale === "th" ? "เจ้าหน้าที่รับเรื่องแล้ว" : "Assigned";
  return locale === "th" ? "กำลังรอเจ้าหน้าที่" : "Waiting";
}

function supportStatusDescription(conversation: SupportSessionResponse["conversation"], locale: WidgetLocale) {
  if (!conversation) return null;
  if (conversation.status === "resolved") {
    return locale === "th"
      ? "การสนทนานี้ปิดแล้ว ส่งข้อความใหม่ภายใน 72 ชั่วโมงเพื่อเปิดเคสเดิมได้"
      : "This conversation is closed. Send another message within 72 hours to reopen it.";
  }
  if (conversation.status === "active" || conversation.assigned_agent_id) {
    return locale === "th" ? "เจ้าหน้าที่รับเรื่องของคุณแล้ว" : "An agent has received your request.";
  }
  return locale === "th" ? "คำขอของคุณกำลังรอเจ้าหน้าที่" : "Your request is waiting for an agent.";
}

function updateWelcomeMessage(
  messages: ChatMessage[],
  locale: WidgetLocale,
  greetingMessage: string,
  greetingMessages?: Partial<Record<WidgetLocale, string>>,
) {
  if (messages.length !== 1 || messages[0].id !== "welcome") return messages;
  return [{ ...messages[0], content: greetingMessages?.[locale] ?? greetingMessage }];
}

const initialSearch: ChatbotSearchState = {
  checkIn: null,
  checkOut: null,
  guests: null,
  budget: null,
  phase: "idle",
};

function buildRoomSearchHref(search: ChatbotSearchState, roomName?: string) {
  if (!search.checkIn || !search.checkOut || !search.guests) {
    return roomName ? `/search?${new URLSearchParams({ roomName }).toString()}` : "/search";
  }

  const params = new URLSearchParams({
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    guests: String(search.guests),
    rooms: "1",
  });
  if (roomName) params.set("roomName", roomName);
  return `/search?${params.toString()}`;
}

function startsBooking(suggestion: ChatbotSuggestion | undefined) {
  return [suggestion?.button_name, suggestion?.translations?.en?.button_name]
    .some((buttonName) => buttonName?.trim().toLowerCase() === "book now");
}

function localizeSuggestion(suggestion: ChatbotSuggestion, locale: WidgetLocale): ChatbotSuggestion {
  const translation = suggestion.translations?.[locale];
  return translation ? {
    ...suggestion,
    topic: translation.topic,
    reply: translation.reply,
    button_name: translation.button_name,
    options: translation.options,
  } : suggestion;
}

const defaultGreeting = "Welcome to Neatly Hotel! 🌟\nI’m your virtual assistant.\nChoose a topic you’d like to know more about. I’m here to help! 😊";

export default function ChatWidget({ greetingMessage = defaultGreeting, greetingMessages, suggestions = [] }: { greetingMessage?: string; greetingMessages?: Partial<Record<WidgetLocale, string>>; suggestions?: ChatbotSuggestion[] }) {
  const router = useRouter();
  const initialMessage: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content: greetingMessage,
  };
  const [isOpen, setIsOpen] = useState(false);
  const [locale, setLocale] = useState<WidgetLocale>("en");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [search, setSearch] = useState<ChatbotSearchState>(initialSearch);
  // Kept only to preserve the legacy markup below while the widget is shared
  // with the live-support work. Nothing sets this to "filter" anymore.
  const [filterSearch, setFilterSearch] = useState<ChatbotSearchState>(initialSearch);
  const [view, setView] = useState<"chat" | "filter">("chat");
  const [bookingSuggestionId, setBookingSuggestionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [hasSelectedRoom, setHasSelectedRoom] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const liveSupport = useLiveSupportVisitor({
    initialMessage,
    locale,
    setMessages,
    setInput,
    setIsLoading,
    onReset: () => setHasSelectedRoom(false),
  });
  const {
    hasRequestedLiveSupport,
    visitorToken,
    supportConversation,
    supportBooking,
    specialRequestOptions,
    isCollectingPhone,
    contactPhone,
    setContactPhone,
    requestLiveSupport: beginLiveSupportRequest,
    createLiveSupport: createLiveSupportRequest,
    sendLiveSupportMessage,
    resetLiveSupport,
  } = liveSupport;

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(CHATBOT_LOCALE_KEY);
    const nextLocale = savedLocale === "th" || savedLocale === "en"
      ? savedLocale
      : navigator.language.toLowerCase().startsWith("th") ? "th" : "en";
    const timeoutId = window.setTimeout(() => {
      setLocale(nextLocale);
      setMessages((current) => updateWelcomeMessage(current, nextLocale, greetingMessage, greetingMessages));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [greetingMessage, greetingMessages]);

  function changeLocale(nextLocale: WidgetLocale) {
    setLocale(nextLocale);
    setMessages((current) => updateWelcomeMessage(current, nextLocale, greetingMessage, greetingMessages));
    window.localStorage.setItem(CHATBOT_LOCALE_KEY, nextLocale);
  }

  useEffect(() => {
    if (!isOpen) return;
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isOpen, messages, isLoading, supportBooking, specialRequestOptions]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

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
          language: locale,
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

  function openMainBooking(roomName?: string) {
    setIsOpen(false);
    router.push(buildRoomSearchHref(search, roomName));
  }

  async function startBooking(room: ChatbotRoomResult) {
    if (!search.checkIn || !search.checkOut || !search.guests) {
      openMainBooking(room.name);
      return;
    }

    const bookingHref = buildBookingHref(room.id, {
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      guests: search.guests,
      rooms: 1,
    });

    setIsBooking(true);
    try {
      setIsOpen(false);
      router.push(bookingHref);
    } finally {
      setIsBooking(false);
    }
  }

  function requestLiveSupport() {
    if (!beginLiveSupportRequest(isLoading)) return;
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: widgetCopy[locale].phonePrompt,
    }]);
  }

  function retryQuestion() {
    const latestQuestion = messages.findLast((message) => message.role === "user")?.content ?? "";
    setInput(latestQuestion);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(latestQuestion.length, latestQuestion.length);
    });
  }

  function createLiveSupport(content: string, phone: string | null = null) {
    if (isLoading || hasRequestedLiveSupport) return;
    const contextMessage = messages.findLast((message) => message.role === "user")?.content ?? content;
    createLiveSupportRequest(content, phone?.trim() || null, contextMessage);
  }

  function startLiveSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = contactPhone.trim();
    const digits = phone.replace(/\D/g, "");
    if (phone && (digits.length < 7 || digits.length > 15)) return;
    createLiveSupport(widgetCopy[locale].supportRequest, phone);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }
  function handleBack() {
    if (view === "filter") {
      setView("chat");
      setBookingSuggestionId(null);
      return;
    }

    if (messages.length === 1) {
      setIsOpen(false);
      return;
    }

    if (hasRequestedLiveSupport) {
      resetLiveSupport();
      return;
    }

    setMessages([initialMessage]);
    setSearch(initialSearch);
    setInput("");
    setHasSelectedRoom(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  const hasSearchProgress = Boolean(search.checkIn || search.checkOut || search.guests || search.budget);
  const completedUserTurns = messages.filter((message) => message.role === "user").length;
  const latestAssistantMessage = messages.findLast((message) => message.role === "assistant");
  const hasUnresolvedQuestion = latestAssistantMessage?.intent === "unknown";
  const hasRoomTypeSuggestion = messages.some(
    (message) => message.role === "assistant" && message.suggestion?.format === "Room type",
  );
  const shouldOfferLiveSupport =
    !hasRequestedLiveSupport && !isCollectingPhone && (
      hasRoomTypeSuggestion || hasSelectedRoom || completedUserTurns >= 3 || hasUnresolvedQuestion
    );
  const liveSupportStatus = supportStatusLabel(supportConversation, locale);
  const liveSupportStatusDescription = supportStatusDescription(supportConversation, locale);
  const isSupportResolved = supportConversation?.status === "resolved";
  const hasBookingConfirmationMessage = messages.some((message) => isBookingConfirmationMessage(message, supportBooking));
  const t = widgetCopy[locale];
  const localizedSuggestions = suggestions.map((suggestion) => localizeSuggestion(suggestion, locale));

  return (
    <aside
      className={`fixed z-50 ${isOpen ? "right-0 bottom-0 max-sm:w-full sm:right-[18px] sm:bottom-[18px]" : "right-2 bottom-[max(8px,env(safe-area-inset-bottom))] sm:right-[18px] sm:bottom-[18px]"}`}
      aria-label="ผู้ช่วย Neatly Hotel"
    >
      {isOpen && (
        <section className="flex h-[min(831px,calc(100dvh-40px))] w-[min(375px,100vw)] flex-col overflow-hidden rounded-t-lg border-0 bg-[#F7F7FB] shadow-[0_22px_70px_rgba(34,40,58,.2)] sm:h-[min(1008px,calc(100dvh-36px))] sm:w-[min(375px,calc(100vw-36px))] sm:rounded-none sm:border sm:border-[#E4E6ED]" aria-live="polite">
          <header className="relative flex h-[60px] min-h-[60px] items-center justify-between border-b border-[#E4E6ED] bg-white pl-4">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F1F5F3] p-1 shadow-[4px_4px_16px_rgba(0,0,0,.08)]">
                <svg className="h-8 w-8" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="9" fill="#DFE9E3"/><path d="M8 10h18v13H15l-5 4v-4H8V10Z" fill="#658477"/><path d="M12 14h10M12 18h7" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M26 4v7M22.5 7.5h7" stroke="#E65B2E" strokeWidth="2"/></svg>
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl leading-[30px] font-semibold tracking-[-.02em] text-[#2A2E3F]">Neatly Assistant</h2>
                {liveSupportStatus && (
                  <p className="m-0 text-[11px] font-medium text-[#69738b]" aria-live="polite">
                    Live Support: {liveSupportStatus}
                  </p>
                )}
              </div>
            </div>
            <button className="grid h-[60px] w-[60px] shrink-0 cursor-pointer place-items-center border-0 bg-transparent text-[#646D89]" type="button" onClick={() => setIsOpen(false)} aria-label="ปิดหน้าต่างแชต">
              <svg className="h-6 w-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19" /></svg>
            </button>
            <div className="absolute right-14 top-3 flex rounded-md border border-[#D6D9E4] bg-white p-0.5 text-[11px] font-semibold text-[#646D89]" aria-label="Language">
              <button type="button" onClick={() => changeLocale("th")} className={`rounded px-1.5 py-1 ${locale === "th" ? "bg-[#E8F0EB] text-[#365A46]" : ""}`}>ไทย</button>
              <button type="button" onClick={() => changeLocale("en")} className={`rounded px-1.5 py-1 ${locale === "en" ? "bg-[#E8F0EB] text-[#365A46]" : ""}`}>EN</button>
            </div>
          </header>

          {(view === "filter" || messages.length > 1 || hasRequestedLiveSupport) && (
            <nav className="flex min-h-[38px] items-center justify-between border-b border-[#ececf1] bg-white px-4" aria-label="การนำทางแชต">
              <button className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[11px] text-[#69738b]" type="button" onClick={handleBack}>
                <svg className="w-[15px] fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                {hasRequestedLiveSupport ? "Reset chat" : "Back"}
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
            {liveSupportStatusDescription && (
              <div className={`rounded-lg border px-3 py-2 text-xs ${isSupportResolved ? "border-[#D5D9E4] bg-[#F0F2F6] text-[#596176]" : "border-[#C9DDD1] bg-[#F1F8F3] text-[#476454]"}`}>
                <span className="font-semibold">{liveSupportStatus}</span> · {liveSupportStatusDescription}
              </div>
            )}
            <ChatMessageList
              messages={messages}
              supportBooking={supportBooking}
              specialRequestOptions={specialRequestOptions}
              visitorToken={visitorToken}
              locale={locale}
              isSupportResolved={isSupportResolved}
              hasBookingConfirmationMessage={hasBookingConfirmationMessage}
              isBooking={isBooking}
              bookNowLabel={t.bookNow}
              viewDetailsLabel={t.viewDetails}
              onStartBooking={(room) => void startBooking(room)}
              onOpenMainBooking={openMainBooking}
              onSelectSuggestedRoom={(room) => {
                setHasSelectedRoom(true);
                void sendMessage(room);
              }}
              onCreateLiveSupport={createLiveSupport}
              onPayment={() => {
                if (supportBooking) router.push("/booking/payment?bookingId=" + supportBooking.id);
              }}
            />
            {messages.length === 1 && (
              <div className="relative z-[1] w-full">
                <div className="flex flex-wrap gap-2" aria-label="หัวข้อยอดนิยม">
                  {localizedSuggestions.map((topic, index) => (
                    <button className="h-10 w-auto cursor-pointer rounded-full border border-[#ABC0B4] bg-[#E6EBE9] px-4 text-left text-base leading-6 tracking-[-.02em] text-[#465C50] hover:border-[#7fa08f] hover:bg-[#dce6e1] focus:outline-2 focus:outline-[#849b8c]"
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        if (startsBooking(suggestions[index])) {
                          setFilterSearch(search);
                          setBookingSuggestionId(topic.id);
                          setView("filter");
                          return;
                        }
                        void sendMessage(topic.topic, search, topic.id);
                      }}
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
                  {hasSelectedRoom ? t.helpRoom : t.help}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hasUnresolvedQuestion && (
                    <button
                      className="h-10 cursor-pointer rounded-full border border-[#ABC0B4] bg-white px-4 text-sm font-medium text-[#465C50] hover:bg-[#F4F8F5] focus:outline-2 focus:outline-[#729280]"
                      type="button"
                      onClick={retryQuestion}
                    >
                      {t.retry}
                    </button>
                  )}
                  <button
                    className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[#C14817] bg-white px-4 text-left text-sm font-medium text-[#B84214] hover:bg-[#FCE5DA] focus:outline-2 focus:outline-[#C14817]"
                    type="button"
                    onClick={requestLiveSupport}
                  >
                    <svg className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 18.5 3.5 21l3.6-1.1A8.5 8.5 0 1 0 3.5 13" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeLinecap="round" strokeWidth="2.5" />
                    </svg>
                    {t.liveSupport}
                  </button>
                </div>
              </div>
            )}
            {isCollectingPhone && (
              <form className="relative z-[1] w-full rounded-xl border border-[#F3C7B8] bg-[#FFF8F5] p-3" onSubmit={startLiveSupport}>
                <label className="grid gap-2 text-sm font-medium text-[#7B472F]">
                  {t.phone}
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder={t.phoneExample}
                    className="h-10 rounded-lg border border-[#E8B8A5] bg-white px-3 text-base text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] focus:border-[#C14817] focus:ring-2 focus:ring-[#C14817]/15"
                  />
                </label>
                <button
                  className="mt-3 h-10 w-full rounded-lg bg-[#C14817] text-sm font-semibold text-white hover:bg-[#A93910] disabled:cursor-default disabled:opacity-60"
                  type="submit"
                  disabled={isLoading}
                >
                  {t.startSupport}
                </button>
              </form>
            )}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="flex gap-1 rounded-[9px] bg-white px-[15px] py-[13px]" aria-label={t.typing}><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98a59e]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98a59e] [animation-delay:.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98a59e] [animation-delay:.3s]" /></div>
              </div>
            )}
          </div>
          ) : (
            <div className="isolate flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto bg-[#F7F7FB] px-4 py-6">
              <p className="m-0 text-center text-sm text-[#646D89]">{locale === "th" ? "ค้นหาห้องว่าง" : "Search available rooms"}</p>
              <div className="mx-auto w-full max-w-[260px]">
                <BookingSearch
                  compact
                  stacked
                  initialQuery={{
                    checkIn: filterSearch.checkIn ?? undefined,
                    checkOut: filterSearch.checkOut ?? undefined,
                    rooms: 1,
                    guests: filterSearch.guests ?? undefined,
                  }}
                  onSearch={(nextSearch) => {
                    const searchState: ChatbotSearchState = {
                      ...filterSearch,
                      checkIn: nextSearch.checkIn || null,
                      checkOut: nextSearch.checkOut || null,
                      guests: nextSearch.guests,
                    };
                    setFilterSearch(searchState);
                    setView("chat");
                    const searchMessage = locale === "th"
                      ? `ค้นหาห้องพัก ${nextSearch.checkIn} ถึง ${nextSearch.checkOut} สำหรับ ${nextSearch.guests} ท่าน`
                      : `Find a room from ${nextSearch.checkIn} to ${nextSearch.checkOut} for ${nextSearch.guests} guests`;
                    void sendMessage(searchMessage, searchState, bookingSuggestionId ?? undefined);
                  }}
                />
              </div>
              <button className="w-full cursor-pointer border-0 bg-transparent text-sm text-[#646D89] underline underline-offset-4" type="button" onClick={() => setView("chat")}>{locale === "th" ? "ให้แชทช่วยแนะนำ" : "Continue in chat"}</button>
            </div>
          )}

          {view === "chat" && (
          <form className="flex min-h-[67px] w-full items-center gap-2 bg-white px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_12px_6px_rgba(0,0,0,.05)] sm:h-[67.33px] sm:min-h-[67.33px] sm:pb-6" onSubmit={handleSubmit}>
            <textarea className="h-[35.33px] min-h-[35.33px] min-w-0 flex-1 resize-none rounded-[16.9952px] border-0 bg-white px-2 py-[5.665px] text-base leading-6 tracking-[-.02em] text-[#42495e] outline-none placeholder:text-[#9AA1B9]"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={800}
              placeholder={t.messagePlaceholder}
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
        className={`${isOpen ? "hidden" : "grid"} h-[88px] w-[88px] cursor-pointer place-items-center rounded-full border-0 bg-transparent transition-transform hover:-translate-y-1 max-sm:h-16 max-sm:w-16`}
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
