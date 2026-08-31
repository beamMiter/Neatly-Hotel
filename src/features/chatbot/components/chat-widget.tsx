"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { buildBookingHref } from "@/features/booking-flow/utils";
import { resolveAddOnQuantity } from "@/lib/addon-pricing";
import type { ChatbotRoomResult, ChatbotSearchState, ChatbotSuggestion } from "@/types/chatbot";
import type { SpecialRequestOption } from "@/types/booking";
import type { SupportBooking, SupportConversation } from "@/types/live-support";

type Intent = "faq" | "search_room" | "unknown";
type WidgetLocale = "th" | "en";

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

type SupportSessionResponse = {
  conversation: Pick<SupportConversation, "id" | "status" | "assigned_agent_id" | "phone_verification_status" | "booking_id"> | null;
  messages: SupportMessageResponse[];
  booking?: SupportBooking | null;
  specialRequestOptions?: SpecialRequestOption[];
};

const LIVE_SUPPORT_TOKEN_KEY = "neatly-live-support-token";
const CHATBOT_LOCALE_KEY = "neatly-chatbot-locale";
const LIVE_SUPPORT_POLL_INTERVAL_MS = 5_000;

const widgetCopy: Record<WidgetLocale, Record<string, string>> = {
  th: { back: "ย้อนกลับ", reset: "เริ่มแชทใหม่", booking: "การจอง", conversation: "บทสนทนา", checkIn: "เข้า", checkOut: "ออก", guests: "ท่าน", budget: "บาท", bookNow: "จองเลย", viewDetails: "ดูรายละเอียด", retry: "ลองถามใหม่", liveSupport: "คุยกับเจ้าหน้าที่", helpRoom: "ต้องการให้เจ้าหน้าที่ช่วยแนะนำห้องนี้ไหม?", help: "ยังต้องการความช่วยเหลือเพิ่มเติมไหม?", phone: "เบอร์โทรศัพท์สำหรับติดต่อกลับ (ไม่บังคับ)", phonePrompt: "หากต้องการให้เจ้าหน้าที่ติดต่อกลับ สามารถกรอกเบอร์โทรศัพท์ได้ (ไม่บังคับ)", phoneExample: "เช่น 081 234 5678", startSupport: "เริ่มคุยกับเจ้าหน้าที่", otp: "รหัสยืนยันจาก SMS", otpPlaceholder: "กรอกรหัส OTP", verifyPhone: "ยืนยันเบอร์โทรศัพท์", typing: "กำลังพิมพ์", messagePlaceholder: "พิมพ์ข้อความ", close: "ปิดหน้าต่างแชท", open: "เปิดแชทกับ Neatly Hotel" },
  en: { back: "Back", reset: "Reset chat", booking: "Booking", conversation: "Conversation", checkIn: "Check-in", checkOut: "Check-out", guests: "guests", budget: "THB", bookNow: "Book Now", viewDetails: "View Details", retry: "Ask again", liveSupport: "Talk to an agent", helpRoom: "Would you like an agent to help with this room?", help: "Do you need more help?", phone: "Phone number for a callback (optional)", phonePrompt: "Enter a phone number if you would like an agent to call you back (optional).", phoneExample: "e.g. 081 234 5678", startSupport: "Start live support", otp: "SMS verification code", otpPlaceholder: "Enter the OTP", verifyPhone: "Verify phone number", typing: "Typing", messagePlaceholder: "Write your message", close: "Close chat", open: "Open chat with Neatly Hotel" },
};

function toChatMessage(message: SupportMessageResponse): ChatMessage {
  return {
    id: message.id,
    role: message.sender === "visitor" ? "user" : "assistant",
    content: message.content,
  };
}

function mergeSupportMessages(current: ChatMessage[], incoming: SupportMessageResponse[]) {
  const knownIds = new Set(current.map((message) => message.id));
  const additions = incoming
    .filter((message) => !knownIds.has(message.id))
    .map(toChatMessage);
  return additions.length > 0 ? [...current, ...additions] : current;
}

function supportStatusLabel(conversation: SupportSessionResponse["conversation"]) {
  if (!conversation) return null;
  if (conversation.status === "resolved") return "Resolved";
  if (conversation.status === "active" || conversation.assigned_agent_id) return "Assigned";
  return "Waiting";
}

function supportStatusDescription(conversation: SupportSessionResponse["conversation"]) {
  if (!conversation) return null;
  if (conversation.status === "resolved") return "This conversation is closed. Reset chat to start a new request.";
  if (conversation.status === "active" || conversation.assigned_agent_id) return "An agent has received your request.";
  return "Your request is waiting for an agent.";
}

function formatBookingDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function isBookingConfirmationMessage(message: ChatMessage, booking: SupportBooking | null) {
  return Boolean(booking && message.role === "assistant" && message.content.startsWith(`Booking ${booking.bookingCode} is ready for confirmation`));
}

function addOnPriceLabel(option: SpecialRequestOption) {
  if (option.billingType === "per_night") return " / night";
  if (option.billingType === "per_leg") return " / trip";
  if (option.billingType === "per_day_guest") return " / guest / day";
  return " / stay";
}

function SupportBookingCard({
  booking,
  specialRequestOptions,
  visitorToken,
  onConfirmed,
}: {
  booking: SupportBooking;
  specialRequestOptions: SpecialRequestOption[];
  visitorToken: string | null;
  onConfirmed: () => void;
}) {
  const isPending = booking.status === "pending_payment";
  const isCancelled = booking.status === "cancelled" || booking.status === "refunded";
  const statusLabel = booking.status === "pending_payment"
    ? "Pending"
    : booking.status === "refunded" ? "Cancelled · Refunded" : booking.status.replaceAll("_", " ");
  const nights = Math.max(
    Math.round((Date.parse(`${booking.checkOut}T00:00:00Z`) - Date.parse(`${booking.checkIn}T00:00:00Z`)) / 86_400_000),
    1,
  );
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>(() => Object.fromEntries(
    booking.specialRequests.map((selected) => {
      const option = specialRequestOptions.find((item) => item.code === selected.code);
      const count = option?.billingType === "per_day_guest"
        ? Math.max(Math.round(selected.quantity / nights), 1)
        : option?.billingType === "per_leg" ? selected.quantity : 1;
      return [selected.code, count];
    }),
  ));
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const addonsTotal = useMemo(() => specialRequestOptions.reduce((sum, option) => {
    const count = selectedCounts[option.code];
    return count
      ? sum + option.price * resolveAddOnQuantity(option.billingType, count, nights)
      : sum;
  }, 0), [nights, selectedCounts, specialRequestOptions]);
  const previewTotal = booking.totalAmount - booking.addonsTotal + addonsTotal;

  function toggleSpecialRequest(code: string) {
    setSelectedCounts((current) => {
      const next = { ...current };
      if (next[code]) delete next[code];
      else next[code] = 1;
      return next;
    });
    setConfirmError("");
  }

  async function confirmBooking() {
    if (isConfirming) return;
    if (specialRequestOptions.length > 0) {
      if (!visitorToken) {
        setConfirmError("Live Support session is unavailable. Please reset the chat and try again.");
        return;
      }
      setIsConfirming(true);
      setConfirmError("");
      try {
        const response = await fetch("/api/live-support/visitor/booking", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorToken,
            bookingId: booking.id,
            specialRequests: Object.entries(selectedCounts).map(([code, count]) => ({ code, count })),
          }),
        });
        const data = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to save special requests");
      } catch (error) {
        setConfirmError(error instanceof Error ? error.message : "Unable to save special requests");
        setIsConfirming(false);
        return;
      }
    }
    onConfirmed();
  }

  return (
    <article className="w-full shrink-0 overflow-hidden rounded-xl border border-[#E7C6BA] bg-white shadow-[0_5px_18px_rgba(91,60,48,.1)]" aria-label={`Booking ${booking.bookingCode}`}>
      <div className="flex items-center justify-between bg-[#FFF1EB] px-4 py-3">
        <div>
          <p className={`m-0 text-xs font-semibold uppercase tracking-[.08em] ${isCancelled ? "text-[#B42318]" : "text-[#A84A25]"}`}>
            {isCancelled ? "Booking cancelled" : "Booking ready"}
          </p>
          <h3 className="m-0 mt-0.5 text-base font-semibold text-[#2A2E3F]">Order {booking.bookingCode}</h3>
        </div>
        <span className={`rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize ${isCancelled ? "text-[#B42318]" : "text-[#A84A25]"}`}>{statusLabel}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 text-sm">
        <div className="col-span-2"><dt className="text-xs text-[#8A91A7]">Room</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{booking.roomType}</dd></div>
        <div><dt className="text-xs text-[#8A91A7]">Check-in</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{formatBookingDate(booking.checkIn)}</dd></div>
        <div><dt className="text-xs text-[#8A91A7]">Check-out</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{formatBookingDate(booking.checkOut)}</dd></div>
        {isPending && specialRequestOptions.length > 0 && (
          <div className="col-span-2 border-t border-[#EEF0F4] pt-3">
            <dt className="text-xs font-semibold uppercase tracking-[.06em] text-[#8A91A7]">Special requests</dt>
            <dd className="m-0 mt-2 grid gap-2">
              {specialRequestOptions.map((option) => {
                const selected = Boolean(selectedCounts[option.code]);
                const allowsCount = option.billingType === "per_leg" || option.billingType === "per_day_guest";
                return (
                  <div className={`rounded-lg border p-2.5 ${selected ? "border-[#E5A98F] bg-[#FFF8F5]" : "border-[#E4E6ED] bg-white"}`} key={option.code}>
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input className="mt-0.5 h-4 w-4 accent-[#C14817]" type="checkbox" checked={selected} onChange={() => toggleSpecialRequest(option.code)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[#2A2E3F]">{option.label}</span>
                        <span className="block text-xs text-[#8A91A7]">THB {option.price.toLocaleString("en-US")}{addOnPriceLabel(option)}</span>
                      </span>
                    </label>
                    {selected && allowsCount && (
                      <label className="mt-2 flex items-center justify-between border-t border-[#F0DDD5] pt-2 text-xs text-[#646D89]">
                        {option.billingType === "per_leg" ? "Trips" : "Guests"}
                        <select className="h-8 rounded-md border border-[#D6D9E4] bg-white px-2 text-sm text-[#2A2E3F]" value={selectedCounts[option.code]} onChange={(event) => setSelectedCounts((current) => ({ ...current, [option.code]: Number(event.target.value) }))}>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </dd>
          </div>
        )}
        <div className="col-span-2 flex items-end justify-between border-t border-[#EEF0F4] pt-3"><dt className="text-sm font-medium text-[#646D89]">Total</dt><dd className="m-0 text-base font-semibold text-[#C14817]">THB {previewTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
      </dl>
      {isPending && confirmError && <p className="m-0 border-t border-[#F3D4C8] bg-[#FFF8F5] px-4 py-2 text-xs text-[#B42318]">{confirmError}</p>}
      {isPending ? <div className="border-t border-[#EEF0F4] p-3">
        <button
          type="button"
          onClick={() => void confirmBooking()}
          disabled={isConfirming}
          className="w-full rounded-lg bg-[#C14817] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A93F13] focus:outline-2 focus:outline-offset-2 focus:outline-[#C14817]"
        >
          {isConfirming ? "Saving requests..." : "Confirm booking"}
        </button>
      </div> : null}
    </article>
  );
}

const initialSearch: ChatbotSearchState = {
  checkIn: null,
  checkOut: null,
  guests: null,
  budget: null,
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

function isSpecialBookingOption(optionName: string) {
  const label = optionName.trim().toLowerCase();
  return label.includes("seminar") || label.includes("group") || label.includes("bulk");
}

function specialBookingRequest(optionName: string) {
  return `สนใจ${optionName}`;
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
  const [hasRequestedLiveSupport, setHasRequestedLiveSupport] = useState(false);
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [supportConversation, setSupportConversation] = useState<SupportSessionResponse["conversation"]>(null);
  const [supportBooking, setSupportBooking] = useState<SupportBooking | null>(null);
  const [specialRequestOptions, setSpecialRequestOptions] = useState<SpecialRequestOption[]>([]);
  const [isCollectingPhone, setIsCollectingPhone] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(CHATBOT_LOCALE_KEY);
    if (savedLocale === "th" || savedLocale === "en") setLocale(savedLocale);
    else if (navigator.language.toLowerCase().startsWith("th")) setLocale("th");
  }, []);

  function changeLocale(nextLocale: WidgetLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem(CHATBOT_LOCALE_KEY, nextLocale);
  }

  useEffect(() => {
    if (messages.length !== 1 || hasRequestedLiveSupport) return;
    const greeting = greetingMessages?.[locale] ?? greetingMessage;
    setMessages([{ id: "welcome", role: "assistant", content: greeting }]);
  }, [greetingMessage, greetingMessages, hasRequestedLiveSupport, locale, messages.length]);

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

  useEffect(() => {
    const savedToken = window.localStorage.getItem(LIVE_SUPPORT_TOKEN_KEY);
    if (!savedToken) return;

    let cancelled = false;
    void fetch(`/api/live-support/visitor?visitorToken=${savedToken}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to restore live support");
        return (await response.json()) as SupportSessionResponse;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.conversation) {
          window.localStorage.removeItem(LIVE_SUPPORT_TOKEN_KEY);
          return;
        }

        setVisitorToken(savedToken);
        setHasRequestedLiveSupport(true);
        setSupportConversation(data.conversation);
        setSupportBooking(data.booking ?? null);
        setSpecialRequestOptions(data.specialRequestOptions ?? []);
        setMessages(data.messages.map(toChatMessage));
      })
      .catch(() => {
        // Keep the token so the visitor can reconnect when the network is available again.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasRequestedLiveSupport || !visitorToken) return;

    let cancelled = false;
    const refreshSupportConversation = async () => {
      try {
        const response = await fetch(`/api/live-support/visitor?visitorToken=${visitorToken}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as SupportSessionResponse;
        if (cancelled || !data.conversation) return;

        setSupportConversation(data.conversation);
        setSupportBooking(data.booking ?? null);
        setSpecialRequestOptions(data.specialRequestOptions ?? []);
        setMessages((current) => mergeSupportMessages(current, data.messages));
      } catch {
        // Polling is the current secure transport; the next interval retries transient failures.
      }
    };

    void refreshSupportConversation();
    const intervalId = window.setInterval(() => void refreshSupportConversation(), LIVE_SUPPORT_POLL_INTERVAL_MS);
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

  async function submitPhoneVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visitorToken || !/^\d{4,10}$/.test(otpCode.trim()) || isLoading) return;

    setIsLoading(true);
    setVerificationError("");
    try {
      const response = await fetch("/api/live-support/visitor/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorToken, code: otpCode.trim() }),
      });
      const data = (await response.json()) as {
        conversation?: SupportSessionResponse["conversation"];
        error?: string;
      };
      if (!response.ok || !data.conversation) {
        throw new Error(data.error ?? "Unable to verify phone number");
      }
      setSupportConversation(data.conversation);
      setOtpCode("");
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Unable to verify phone number");
    } finally {
      setIsLoading(false);
    }
  }

  function requestLiveSupport() {
    if (isLoading || hasRequestedLiveSupport || isCollectingPhone) return;

    setIsCollectingPhone(true);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: widgetCopy[locale].phonePrompt,
      },
    ]);
  }

  function retryQuestion() {
    setInput("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function createLiveSupport(content: string, phone: string | null = null) {
    if (isLoading || hasRequestedLiveSupport) return;
    const normalizedPhone = phone?.trim() ?? "";
    const savedToken = window.localStorage.getItem(LIVE_SUPPORT_TOKEN_KEY);
    const token = savedToken ?? crypto.randomUUID();
    if (!savedToken) window.localStorage.setItem(LIVE_SUPPORT_TOKEN_KEY, token);

    setIsLoading(true);
    void fetch("/api/live-support/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorToken: token,
        contactPhone: normalizedPhone || null,
        content,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to start live support");
        const data = (await response.json()) as {
          conversation: SupportSessionResponse["conversation"];
          message: SupportMessageResponse;
        };
        setVisitorToken(token);
        setHasRequestedLiveSupport(true);
        setSupportConversation(data.conversation);
        setIsCollectingPhone(false);
        setMessages([
          {
            id: data.message.id,
            role: "user",
            content,
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

  function startLiveSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = contactPhone.trim();
    const digits = phone.replace(/\D/g, "");
    if (phone && (digits.length < 7 || digits.length > 15)) return;
    createLiveSupport("ต้องการพูดคุยกับเจ้าหน้าที่ Live Support", phone);
  }

  async function sendLiveSupportMessage(content: string) {
    if (!visitorToken || isSupportResolved) return;

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
      const data = (await response.json()) as {
        conversation: SupportSessionResponse["conversation"];
        message: SupportMessageResponse;
      };
      setSupportConversation(data.conversation);
      setMessages((current) => current.map((message) => (
        message.id === messageId ? toChatMessage(data.message) : message
      )));
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
    const searchMessage = `ค้นหาห้องพัก ${filterSearch.checkIn} ถึง ${filterSearch.checkOut} สำหรับ ${filterSearch.guests} ท่าน`;
    setView("chat");
    void sendMessage(searchMessage, filterSearch, bookingSuggestionId ?? undefined);
  }

  function resetLiveSupport() {
    window.localStorage.removeItem(LIVE_SUPPORT_TOKEN_KEY);
    setVisitorToken(null);
    setHasRequestedLiveSupport(false);
    setSupportConversation(null);
    setSupportBooking(null);
    setSpecialRequestOptions([]);
    setIsCollectingPhone(false);
    setContactPhone("");
    setInput("");
    setHasSelectedRoom(false);
    setMessages([initialMessage]);
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
  const latestAssistantMessage = messages.findLast((message) => message.role === "assistant");
  const hasUnresolvedQuestion = latestAssistantMessage?.intent === "unknown";
  const hasRoomTypeSuggestion = messages.some(
    (message) => message.role === "assistant" && message.suggestion?.format === "Room type",
  );
  const shouldOfferLiveSupport =
    !hasRequestedLiveSupport && !isCollectingPhone && (
      hasRoomTypeSuggestion || hasSelectedRoom || completedUserTurns >= 3 || hasUnresolvedQuestion
    );
  const liveSupportStatus = supportStatusLabel(supportConversation);
  const liveSupportStatusDescription = supportStatusDescription(supportConversation);
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
            {messages.map((message) => isBookingConfirmationMessage(message, supportBooking) && supportBooking && !isSupportResolved ? (
              <SupportBookingCard
                key={message.id}
                booking={supportBooking}
                specialRequestOptions={specialRequestOptions}
                visitorToken={visitorToken}
                onConfirmed={() => router.push(`/booking/payment?bookingId=${supportBooking.id}`)}
              />
            ) : (
              <div key={message.id} className="w-full">
                <div className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p className={`m-0 max-w-[255px] whitespace-pre-line rounded-lg px-4 py-2 text-base leading-6 tracking-[-.02em] ${message.role === "user" ? "bg-[#C14817] text-white" : "bg-white text-[#646D89]"}`}>{message.content}</p>
                </div>
                {!!message.rooms?.length && (
                  <div className="relative z-[1] -mr-4 mt-4 flex snap-x gap-2 overflow-x-auto pr-4 pb-2">
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
                        <div className="flex h-10 items-center bg-[#FAEDE8] p-2">
                          {startsBooking(message.suggestion) ? (
                            <button
                              className="flex w-full cursor-pointer items-center justify-center px-2 py-1 [font-family:var(--font-open-sans)] text-base leading-4 font-semibold text-[#E76B39] disabled:cursor-wait disabled:opacity-60"
                              type="button"
                              disabled={isBooking}
                              onClick={() => void startBooking(room)}
                            >
                              {isBooking ? "Checking..." : t.bookNow}
                            </button>
                          ) : (
                            <Link className="flex w-full cursor-pointer items-center justify-between px-2 py-1 [font-family:var(--font-open-sans)] text-base leading-4 font-semibold text-[#E76B39]" href={room.detailHref}>
                              {t.viewDetails}
                              <span className="text-2xl font-light leading-4" aria-hidden="true">›</span>
                            </Link>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {message.suggestion?.format === "Option with details" && message.suggestion.options.length > 0 && (
                  <div className="mt-3 grid max-w-[300px] gap-2">
                    {message.suggestion.options.map((option) => isSpecialBookingOption(option.name) ? (
                      <button className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#DDE3E0] bg-white px-4 py-2 text-left font-semibold text-[#465C50] hover:border-[#ABC0B4] hover:bg-[#F4F8F5]" key={option.name} type="button" onClick={() => createLiveSupport(specialBookingRequest(option.name))}>
                        <span aria-hidden="true">▶</span>{option.name}
                      </button>
                    ) : (
                      <details className="rounded-lg border border-[#DDE3E0] bg-white px-4 py-2 text-[#646D89]" key={option.name}>
                        <summary className="cursor-pointer font-semibold text-[#465C50]">{option.name}</summary>
                        <p className="mt-2 text-sm leading-5">{option.details}</p>
                      </details>
                    ))}
                  </div>
                )}
                {message.suggestion?.format === "Room type" && !message.rooms?.length && message.suggestion.rooms.length > 0 && (
                  <div className="mt-3 flex max-w-[320px] flex-wrap gap-2">
                    {message.suggestion.rooms.map((room) => (
                      <button className="rounded-full border border-[#ABC0B4] bg-white px-3 py-2 text-sm text-[#465C50]" key={room} type="button" onClick={() => { setHasSelectedRoom(true); startsBooking(message.suggestion) ? openMainBooking(room) : void sendMessage(room); }}>
                        {room}{message.suggestion?.button_name ? ` · ${message.suggestion.button_name}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {supportBooking && !isSupportResolved && !hasBookingConfirmationMessage && (
              <SupportBookingCard
                booking={supportBooking}
                specialRequestOptions={specialRequestOptions}
                visitorToken={visitorToken}
                onConfirmed={() => router.push(`/booking/payment?bookingId=${supportBooking.id}`)}
              />
            )}
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
            {supportConversation?.phone_verification_status === "pending" && (
              <form className="relative z-[1] w-full rounded-xl border border-[#B9D5C5] bg-[#F3FAF6] p-3" onSubmit={submitPhoneVerification}>
                <label className="grid gap-2 text-sm font-medium text-[#365A46]">
                  {t.otp}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={t.otpPlaceholder}
                    className="h-10 rounded-lg border border-[#A9C8B6] bg-white px-3 text-center text-lg tracking-[0.25em] text-[#244333] outline-none focus:border-[#648C76] focus:ring-2 focus:ring-[#648C76]/15"
                    required
                  />
                </label>
                {verificationError ? <p className="mt-2 text-xs text-[#B42318]">{verificationError}</p> : null}
                <button
                  className="mt-3 h-10 w-full rounded-lg bg-[#527865] text-sm font-semibold text-white hover:bg-[#426554] disabled:cursor-default disabled:opacity-60"
                  type="submit"
                  disabled={isLoading || otpCode.length < 4}
                >
                  {t.verifyPhone}
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
              disabled={isCollectingPhone || isSupportResolved}
            />
            <button className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center border-0 bg-transparent disabled:cursor-default disabled:opacity-60" type="submit" disabled={!input.trim() || isLoading || isCollectingPhone || isSupportResolved} aria-label="ส่งข้อความ">
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
