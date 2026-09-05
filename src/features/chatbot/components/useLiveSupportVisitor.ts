"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SpecialRequestOption } from "@/types/booking";
import type { SupportBooking } from "@/types/live-support";
import type { ChatMessage, SupportMessageResponse, SupportSessionResponse, WidgetLocale } from "@/features/chatbot/components/chat-widget.types";
import {
  mergeChatMessages,
  mergeSupportMessages,
  toChatMessage,
} from "@/features/chatbot/components/live-support-message-order";
import { LIVE_SUPPORT_TOKEN_KEY } from "@/lib/support-booking-proposal";

const LIVE_SUPPORT_POLL_INTERVAL_MS = 5_000;

export function useLiveSupportVisitor({
  initialMessage,
  locale,
  setMessages,
  setInput,
  setIsLoading,
  onReset,
}: {
  initialMessage: ChatMessage;
  locale: WidgetLocale;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setInput: Dispatch<SetStateAction<string>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  onReset: () => void;
}) {
  const [hasRequestedLiveSupport, setHasRequestedLiveSupport] = useState(false);
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [supportConversation, setSupportConversation] = useState<SupportSessionResponse["conversation"]>(null);
  const [supportBooking, setSupportBooking] = useState<SupportBooking | null>(null);
  const [specialRequestOptions, setSpecialRequestOptions] = useState<SpecialRequestOption[]>([]);
  const [isCollectingPhone, setIsCollectingPhone] = useState(false);
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    const savedToken = window.localStorage.getItem(LIVE_SUPPORT_TOKEN_KEY);
    if (!savedToken) return;
    let cancelled = false;
    void fetch("/api/live-support/visitor?visitorToken=" + savedToken, { cache: "no-store" })
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
        setMessages(mergeSupportMessages([], data.messages));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [setMessages]);

  useEffect(() => {
    if (!hasRequestedLiveSupport || !visitorToken) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/live-support/visitor?visitorToken=" + visitorToken, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as SupportSessionResponse;
        if (cancelled || !data.conversation) return;
        setSupportConversation(data.conversation);
        setSupportBooking(data.booking ?? null);
        setSpecialRequestOptions(data.specialRequestOptions ?? []);
        setMessages((current) => mergeSupportMessages(current, data.messages));
      } catch {}
    };
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), LIVE_SUPPORT_POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, [hasRequestedLiveSupport, setMessages, visitorToken]);

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
    setMessages([initialMessage]);
    onReset();
  }

  function requestLiveSupport(isLoading: boolean) {
    if (isLoading || hasRequestedLiveSupport || isCollectingPhone) return false;
    setIsCollectingPhone(true);
    return true;
  }

  function createLiveSupport(content: string, phone: string | null, contextMessage: string) {
    if (hasRequestedLiveSupport) return;
    const savedToken = window.localStorage.getItem(LIVE_SUPPORT_TOKEN_KEY);
    const token = savedToken ?? crypto.randomUUID();
    if (!savedToken) window.localStorage.setItem(LIVE_SUPPORT_TOKEN_KEY, token);
    setIsLoading(true);
    void fetch("/api/live-support/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorToken: token, contactPhone: phone, content, locale, contextMessage }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to start live support");
        return (await response.json()) as {
          conversation: SupportSessionResponse["conversation"];
          message: SupportMessageResponse;
          systemMessage: SupportMessageResponse | null;
          contextMessage: SupportMessageResponse | null;
        };
      })
      .then((data) => {
        setVisitorToken(token);
        setHasRequestedLiveSupport(true);
        setSupportConversation(data.conversation);
        setIsCollectingPhone(false);
        setMessages(mergeChatMessages([], [
          toChatMessage(data.message),
          ...(data.systemMessage ? [toChatMessage(data.systemMessage)] : []),
          ...(data.contextMessage ? [toChatMessage(data.contextMessage)] : []),
        ]));
      })
      .catch(() => setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: locale === "th" ? "ไม่สามารถเชื่อมต่อเจ้าหน้าที่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้งค่ะ" : "Unable to connect to our team right now. Please try again.",
      }]))
      .finally(() => setIsLoading(false));
  }

  async function sendLiveSupportMessage(content: string) {
    if (!visitorToken) return;
    const messageId = crypto.randomUUID();
    setMessages((current) => [...current, {
      id: messageId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    }]);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/live-support/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorToken, content, locale }),
      });
      const data = (await response.json()) as {
        conversation: SupportSessionResponse["conversation"];
        message: SupportMessageResponse;
        systemMessage?: SupportMessageResponse | null;
        expired?: boolean;
      };
      if (!response.ok) {
        if (data.expired) { resetLiveSupport(); return; }
        throw new Error("Unable to send support message");
      }
      setSupportConversation(data.conversation);
      setMessages((current) => mergeChatMessages(
        current.map((message) => message.id === messageId ? toChatMessage(data.message) : message),
        data.systemMessage ? [toChatMessage(data.systemMessage)] : [],
      ));
    } catch {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: locale === "th" ? "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ" : "Unable to send your message. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    hasRequestedLiveSupport,
    visitorToken,
    supportConversation,
    supportBooking,
    specialRequestOptions,
    isCollectingPhone,
    contactPhone,
    setContactPhone,
    requestLiveSupport,
    createLiveSupport,
    sendLiveSupportMessage,
    resetLiveSupport,
  };
}
