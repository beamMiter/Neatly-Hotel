"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupportAgent, SupportBooking, SupportConversation, SupportConversationStatus, SupportCustomer, SupportMessage } from "@/types/live-support";

export function useLiveSupportAdmin(selectedThreadId: string | null, onInitialSelection?: (id: string) => void) {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<SupportCustomer | null>(null);
  const [bookings, setBookings] = useState<SupportBooking[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null);

  const refresh = useCallback(async (reset = false) => {
    await Promise.resolve();
    if (reset) {
      setLoadedConversationId(null);
      setSupportMessages([]);
      setCustomer(null);
      setBookings([]);
    }

    try {
      const query = selectedThreadId ? `?conversationId=${selectedThreadId}` : "";
      const response = await fetch(`/api/live-support/admin${query}`, { cache: "no-store" });
      if (!response.ok) return null;
      const data = await response.json() as {
        conversations: SupportConversation[];
        agents: SupportAgent[];
        currentAdminId: string;
        selectedConversationId: string | null;
        messages: SupportMessage[];
        customer: SupportCustomer | null;
        bookings: SupportBooking[];
      };
      setConversations(data.conversations);
      setAgents(data.agents);
      setCurrentAdminId(data.currentAdminId);
      setSupportMessages(data.messages);
      setCustomer(data.customer);
      setBookings(data.bookings);
      setLoadedConversationId(data.selectedConversationId);
      return data.selectedConversationId;
    } catch {
      return null;
    }
  }, [selectedThreadId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const selectedConversationId = await refresh(true);
      if (!cancelled && !selectedThreadId && selectedConversationId) onInitialSelection?.(selectedConversationId);
    };
    void load();
    const intervalId = window.setInterval(() => void refresh(), 5000);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, [onInitialSelection, refresh, selectedThreadId]);

  async function sendReply(conversationId: string | null, content: string) {
    if (!conversationId || !content.trim() || isSending) return false;
    setIsSending(true);
    try {
      const response = await fetch("/api/live-support/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: content.trim() }),
      });
      if (!response.ok) return false;
      const data = await response.json() as { message: SupportMessage };
      setSupportMessages((current) => [...current, data.message]);
      return true;
    } finally {
      setIsSending(false);
    }
  }

  async function updateConversation(conversation: SupportConversation | null, update: { assignedAgentId?: string | null; status?: SupportConversationStatus }) {
    if (!conversation) return null;
    const response = await fetch("/api/live-support/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id, ...update }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { conversation: SupportConversation };
    setConversations((current) => current.map((item) => item.id === data.conversation.id ? data.conversation : item));
    return data.conversation;
  }

  async function markConversationRead(conversationId: string) {
    const response = await fetch("/api/live-support/admin/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
    if (!response.ok) return false;

    const data = await response.json() as { lastReadAt: string };
    setConversations((current) => current.map((conversation) => (
      conversation.id === conversationId
        ? { ...conversation, last_read_at: data.lastReadAt }
        : conversation
    )));
    return true;
  }

  function appendSupportMessage(message: SupportMessage) {
    setSupportMessages((current) => (
      current.some((item) => item.id === message.id) ? current : [...current, message]
    ));
  }

  const isConversationLoading = Boolean(selectedThreadId && loadedConversationId !== selectedThreadId);

  return { conversations, supportMessages, agents, currentAdminId, customer, bookings, isSending, isConversationLoading, sendReply, updateConversation, markConversationRead, appendSupportMessage, refresh };
}
