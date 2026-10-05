"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  SupportBooking,
  SupportBookingProposal,
  SupportConversation,
  SupportConversationStatus,
  SupportMessage,
} from "@/types/live-support";
import { useLiveSupportAdmin } from "@/features/live-support/components/useLiveSupportAdmin";
import { decodeSupportBookingProposal } from "@/lib/support-booking-proposal";
import { CloseIcon } from "@/components/icons/CloseIcon";

type SupportTab = "unassigned" | "mine" | "team" | "resolved";
type SupportFilter = "all" | "booking" | "room" | "payment" | "other";
type MobilePanel = "conversations" | "chat";

type Conversation = {
  id: string;
  tab: SupportTab;
  name: string;
  preview: string;
  time: string;
  tags: string[];
  unread?: boolean;
  active?: boolean;
  initials: string;
  accent: string;
};

const TABS: Array<{ key: SupportTab; label: string }> = [
  { key: "unassigned", label: "Unassigned" },
  { key: "mine", label: "My Chats" },
  { key: "team", label: "Team Chats" },
  { key: "resolved", label: "Resolved" },
];

const FILTERS: Array<{ key: SupportFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "booking", label: "Booking" },
  { key: "room", label: "Room" },
  { key: "payment", label: "Payment" },
  { key: "other", label: "Other" },
];

// Conversation-list rows show category as a left accent bar + tooltip rather
// than a text pill — a pill competed with the name/time for the row's width
// and was the direct cause of text getting clipped.
const CATEGORY_LABEL: Record<string, string> = {
  booking: "Booking",
  room: "Room",
  payment: "Payment",
  other: "Other",
  vip: "VIP",
};
const CATEGORY_ACCENT: Record<string, string> = {
  booking: "bg-[#2f6bd6]",
  room: "bg-[#64748b]",
  payment: "bg-[#1a9d63]",
  other: "bg-[#c7cedb]",
  vip: "bg-[#d97706]",
};

export function LiveSupportPage() {
  const [activeTab, setActiveTab] = useState<SupportTab>("unassigned");
  const [activeFilter, setActiveFilter] = useState<SupportFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("conversations");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isChatAtBottom, setIsChatAtBottom] = useState(true);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isDesktopChatVisible, setIsDesktopChatVisible] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const chatViewportRef = useRef<HTMLDivElement>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const lastMarkedReadMessageRef = useRef<string | null>(null);
  const {
    conversations,
    supportMessages,
    agents,
    currentAdminId,
    customer,
    bookings,
    isSending,
    supportError,
    isConversationLoading,
    sendReply: sendSupportReply,
    updateConversation: updateSupportConversation,
    markConversationRead,
    appendSupportMessage,
    refresh,
  } = useLiveSupportAdmin(selectedThreadId, setSelectedThreadId);

  const threads = useMemo<Conversation[]>(
    () =>
      conversations.map((conversation) => ({
        id: conversation.id,
        tab:
          conversation.status === "resolved"
            ? "resolved"
            : !conversation.assigned_agent_id
              ? "unassigned"
              : conversation.assigned_agent_id === currentAdminId
                ? "mine"
                : "team",
        name:
          conversation.customer_name ?? `Guest ${conversation.id.slice(0, 6)}`,
        preview: conversation.latest_message_content ?? "No messages yet",
        time: formatThreadTimestamp(conversation.last_message_at),
        tags: [conversation.topic],
        unread: Boolean(
          conversation.latest_visitor_message_at &&
          (!conversation.last_read_at ||
            new Date(conversation.latest_visitor_message_at).getTime() >
              new Date(conversation.last_read_at).getTime()),
        ),
        initials: initialsForName(conversation.customer_name ?? "Guest"),
        accent: avatarAccent(conversation.id),
      })),
    [conversations, currentAdminId],
  );

  const unreadConversationCount = threads.filter(
    (thread) => thread.unread,
  ).length;
  const unreadNotifications = useMemo(
    () => threads.filter((thread) => thread.unread),
    [threads],
  );
  const unassignedConversationCount = conversations.filter(
    (conversation) =>
      conversation.status !== "resolved" && !conversation.assigned_agent_id,
  ).length;
  // Distinct agents with an active conversation right now — the most honest
  // "live" signal available (there's no agent presence/online tracking), so
  // the header badge reflects this instead of a static, meaningless "Live".
  const activeAgentCount = new Set(
    conversations
      .filter(
        (conversation) =>
          conversation.status === "active" && conversation.assigned_agent_id,
      )
      .map((conversation) => conversation.assigned_agent_id),
  ).size;
  const hasActiveAgent = activeAgentCount > 0;

  const visibleThreads = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return threads.filter((thread) => {
      if (thread.tab !== activeTab) return false;
      if (activeFilter !== "all" && !thread.tags.includes(activeFilter)) {
        return false;
      }

      if (!normalized) return true;

      return [thread.name, thread.preview, thread.time, ...thread.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [activeFilter, activeTab, search, threads]);

  // The open chat must always come from the same id used by the message API.
  // Filters only affect the list; they must never silently swap the chat pane
  // to another customer while selectedThreadId still points at the old one.
  const currentThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const currentConversation =
    conversations.find(
      (conversation) => conversation.id === currentThread?.id,
    ) ?? null;
  const isCurrentConversationResolved =
    currentConversation?.status === "resolved";
  const isAssignedToCurrentAdmin = Boolean(
    currentConversation?.assigned_agent_id &&
    currentConversation.assigned_agent_id === currentAdminId,
  );
  const assignedAgent =
    agents.find(
      (agent) => agent.id === currentConversation?.assigned_agent_id,
    ) ?? null;
  const lastSupportMessageId = supportMessages.at(-1)?.id ?? null;
  const latestVisitorMessageId = supportMessages.reduce<string | null>(
    (latestMessageId, message) =>
      message.sender === "visitor" ? message.id : latestMessageId,
    null,
  );
  const isChatPaneVisible = mobilePanel === "chat" || isDesktopChatVisible;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1536px)");
    const updateDesktopVisibility = () =>
      setIsDesktopChatVisible(mediaQuery.matches);
    const updateDocumentVisibility = () =>
      setIsDocumentVisible(document.visibilityState === "visible");

    updateDesktopVisibility();
    updateDocumentVisibility();
    mediaQuery.addEventListener("change", updateDesktopVisibility);
    document.addEventListener("visibilitychange", updateDocumentVisibility);
    return () => {
      mediaQuery.removeEventListener("change", updateDesktopVisibility);
      document.removeEventListener(
        "visibilitychange",
        updateDocumentVisibility,
      );
    };
  }, []);

  useEffect(() => {
    if (!isDetailsOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDetailsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDetailsOpen]);

  function scrollChatToBottom(behavior: ScrollBehavior = "smooth") {
    const viewport = chatViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    setIsChatAtBottom(true);
    setHasNewMessagesBelow(false);
  }

  useEffect(() => {
    previousLastMessageIdRef.current = null;
    const frameId = window.requestAnimationFrame(() => {
      setHasNewMessagesBelow(false);
      setIsChatAtBottom(true);
      scrollChatToBottom("auto");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedThreadId]);

  useEffect(() => {
    if (
      !lastSupportMessageId ||
      lastSupportMessageId === previousLastMessageIdRef.current
    )
      return;
    const isFirstMessageForSelection =
      previousLastMessageIdRef.current === null;
    previousLastMessageIdRef.current = lastSupportMessageId;

    if (isFirstMessageForSelection || isChatAtBottom) {
      window.requestAnimationFrame(() =>
        scrollChatToBottom(isFirstMessageForSelection ? "auto" : "smooth"),
      );
      return;
    }
    setHasNewMessagesBelow(true);
  }, [isChatAtBottom, lastSupportMessageId]);

  useEffect(() => {
    if (
      !currentConversation ||
      !latestVisitorMessageId ||
      isConversationLoading ||
      !isChatPaneVisible ||
      !isDocumentVisible ||
      !isChatAtBottom
    )
      return;

    const readKey = `${currentConversation.id}:${latestVisitorMessageId}`;
    if (lastMarkedReadMessageRef.current === readKey) return;

    lastMarkedReadMessageRef.current = readKey;
    void markConversationRead(currentConversation.id).then((marked) => {
      if (!marked && lastMarkedReadMessageRef.current === readKey) {
        lastMarkedReadMessageRef.current = null;
      }
    });
  }, [
    currentConversation,
    isChatAtBottom,
    isChatPaneVisible,
    isConversationLoading,
    isDocumentVisible,
    latestVisitorMessageId,
    markConversationRead,
  ]);

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = reply.trim();
    if (
      !content ||
      !currentConversation ||
      isConversationLoading ||
      isCurrentConversationResolved ||
      isSending
    )
      return;

    if (await sendSupportReply(currentConversation.id, content)) {
      setReply("");
      window.requestAnimationFrame(() => scrollChatToBottom());
    }
  }

  async function updateConversation(
    update:
      | {
          action: "claim";
        }
      | {
          action: "takeover";
          expectedAssignedAgentId: string;
        }
      | {
          action: "regenerate_summary";
        }
      | {
          status: Extract<SupportConversationStatus, "active" | "resolved">;
        },
  ) {
    if (!currentConversation) return;

    const updatedConversation = await updateSupportConversation(
      currentConversation,
      update,
    );
    if (!updatedConversation) return;
    setActiveTab(
      updatedConversation.status === "resolved"
        ? "resolved"
        : !updatedConversation.assigned_agent_id
          ? "unassigned"
          : updatedConversation.assigned_agent_id === currentAdminId
            ? "mine"
            : "team",
    );
  }

  function openNotification(conversationId: string) {
    setSelectedThreadId(conversationId);
    setMobilePanel("chat");
    setIsNotificationsOpen(false);
    void markConversationRead(conversationId);
  }

  function markAllNotificationsRead() {
    void Promise.all(
      unreadNotifications.map((notification) =>
        markConversationRead(notification.id),
      ),
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#F7F8FA] text-[#1f2937]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-10 h-72 w-72 rounded-full bg-brand-primary/8 blur-3xl" />
        <div className="absolute right-1/3 bottom-[-6rem] h-72 w-72 rounded-full bg-[#f0ede8]/60 blur-3xl" />
      </div>

      <header
        className={`relative ${isNotificationsOpen ? "z-40" : "z-10"} flex h-16 shrink-0 items-center justify-between border-b border-[#e7eaf0] bg-white px-4 shadow-[0_1px_0_rgba(17,24,39,0.02)] sm:h-[72px] sm:px-6 xl:px-8`}
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#111827] sm:text-[24px]">
                Live Support
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium sm:gap-2 sm:text-[13px] ${hasActiveAgent ? "text-[#299b50]" : "text-[#98A2B3]"}`}
              >
                <CustomerLiveSupportIcon className="h-7 w-7" />
                {hasActiveAgent ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[14px] text-[#3f4a5a] sm:gap-5">
          <span className="hidden items-center gap-2 sm:inline-flex">
            <span className="h-2.5 w-2.5 rounded-full bg-[#20b15d]" />
            {unassignedConversationCount} unassigned
          </span>
          <span className="hidden h-6 w-px bg-[#e3e8ef] sm:block" aria-hidden />
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              className="relative z-20 grid h-11 w-11 place-items-center rounded-full border border-[#e2e7ef] bg-white text-[#5f6b7a] transition-colors hover:bg-[#f7f9fc]"
              aria-label="Notifications"
              aria-haspopup="menu"
              aria-expanded={isNotificationsOpen}
            >
              <BellIcon className="h-5 w-5" />
              {unreadConversationCount > 0 ? (
                <span className="absolute -right-0.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#e11d48] px-1 text-[11px] font-semibold text-white">
                  {unreadConversationCount > 99
                    ? "99+"
                    : unreadConversationCount}
                </span>
              ) : null}
            </button>
            {isNotificationsOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-label="Close notifications"
                />
                <section
                  role="menu"
                  aria-label="Live Support notifications"
                  className="absolute right-0 top-full z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[8px] border border-[#e2e7ef] bg-white shadow-[0_16px_36px_rgba(16,24,40,0.18)]"
                >
                  <div className="flex items-center justify-between border-b border-[#edf0f5] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">
                        New customer messages
                      </p>
                      <p className="mt-0.5 text-xs text-[#667085]">
                        {unreadNotifications.length} unread
                      </p>
                    </div>
                    {unreadNotifications.length > 0 ? (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover"
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                  {unreadNotifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-[#667085]">
                      You&apos;re all caught up.
                    </p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto">
                      {unreadNotifications.map((notification) => (
                        <li
                          key={notification.id}
                          className="border-b border-[#edf0f5] last:border-b-0"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openNotification(notification.id)}
                            className="w-full px-4 py-3 text-left hover:bg-[#f7f9fc]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-semibold text-[#344054]">
                                {notification.name}
                              </span>
                              <span className="shrink-0 text-xs text-[#667085]">
                                {notification.time}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085]">
                              {notification.preview}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <nav
        className="relative z-10 grid h-12 shrink-0 grid-cols-2 border-b border-[#e7eaf0] bg-white 2xl:hidden"
        aria-label="Live support sections"
      >
        {(
          [
            ["conversations", "Conversations"],
            ["chat", "Chat"],
          ] as const
        ).map(([panel, label]) => (
          <button
            key={panel}
            type="button"
            onClick={() => setMobilePanel(panel)}
            className={`border-b-2 px-2 text-sm font-medium transition-colors ${mobilePanel === panel ? "border-brand-primary text-brand-primary" : "border-transparent text-[#667085]"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-2 p-2 sm:gap-4 sm:p-4 2xl:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] 2xl:p-6">
        <section
          className={`${mobilePanel === "conversations" ? "flex" : "hidden"} min-h-0 flex-col overflow-hidden rounded-[8px] border border-[#e7ebf2] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] 2xl:flex`}
        >
          <div className="border-b border-[#edf0f5] px-4 pt-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] font-medium text-[#667085]">
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative pb-2.5 text-center transition-colors ${
                      active ? "text-[#21366d]" : "hover:text-[#344054]"
                    }`}
                  >
                    <span>
                      {tab.label} (
                      {
                        threads.filter((thread) => thread.tab === tab.key)
                          .length
                      }
                      )
                    </span>
                    <span
                      className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-colors ${
                        active ? "bg-brand-primary" : "bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <label className="relative mt-3 block">
              <span className="sr-only">
                Search customer, booking, or message
              </span>
              <span className="pointer-events-none absolute left-3 top-3 text-[#98A2B3]">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, booking, or message..."
                className="h-11 w-full rounded-[8px] border border-[#d9deea] bg-[#fbfcfe] pr-4 pl-10 text-[14px] text-[#344054] outline-none placeholder:text-[#98A2B3] focus:border-brand-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(189,91,40,0.08)]"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2 pb-3">
              {FILTERS.map((filter) => {
                const active = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`h-8 shrink-0 rounded-full border px-3.5 text-[13px] transition-colors ${
                      active
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                        : "border-[#d7ddea] bg-white text-[#556070] hover:border-[#c4cbe0]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
            <div className="grid grid-cols-1 gap-2">
              {visibleThreads.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-[14px] text-[#98A2B3]">
                  <SearchIcon className="h-8 w-8 text-[#d7deea]" />
                  <p>No conversations match this filter.</p>
                </div>
              ) : (
                visibleThreads.map((thread) => {
                  const isActive = thread.id === currentThread?.id;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        setMobilePanel("chat");
                      }}
                      className={`relative flex w-full items-start gap-3 rounded-[8px] py-3 pr-3 pl-4 text-left transition-colors ${
                        isActive ? "bg-brand-primary/8" : "hover:bg-[#f7f8fb]"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-2 left-1.5 w-[3px] rounded-full ${CATEGORY_ACCENT[thread.tags[0] ?? "other"]}`}
                        title={CATEGORY_LABEL[thread.tags[0] ?? "other"]}
                        aria-hidden
                      />

                      <span className="relative shrink-0">
                        <Avatar
                          initials={thread.initials}
                          accent={thread.accent}
                        />
                        {thread.unread && thread.id !== selectedThreadId ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#f04438]"
                            aria-label="Unread visitor message"
                          />
                        ) : null}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[15px] font-semibold text-[#111827]">
                            {thread.name}
                          </p>
                          <span className="shrink-0 text-[12px] text-[#98A2B3]">
                            {thread.time}
                          </span>
                        </div>

                        <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-[#667085]">
                          {thread.preview}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section
          className={`${mobilePanel === "chat" ? "flex" : "hidden"} min-h-0 flex-col overflow-hidden rounded-[8px] border border-[#e7ebf2] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] 2xl:flex`}
        >
          <div className="flex shrink-0 flex-col gap-3 border-b border-[#edf0f5] px-3 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobilePanel("conversations")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#667085] hover:bg-[#f2f4f7] 2xl:hidden"
                aria-label="Back to conversations"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <Avatar
                initials={currentThread?.initials ?? "?"}
                accent={currentThread?.accent ?? "from-[#eef2f7] to-[#f8fafc]"}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[18px] font-semibold text-[#111827]">
                  {currentThread?.name ?? "Guest"}
                </h2>
                <p className="flex items-center gap-2 text-[13px] text-[#667085]">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${conversationStatusDotClass(currentConversation?.status)}`}
                  />
                  {conversationStatusLabel(currentConversation?.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e2e7ef] text-[#667085] hover:bg-[#f2f4f7]"
                aria-label="View customer details"
              >
                <InfoIcon className="h-6 w-6" />
              </button>
            </div>

            {currentConversation?.assigned_agent_id ? (
              <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-2 pr-2 sm:gap-3">
                {isAssignedToCurrentAdmin ? (
                  <span className="inline-flex h-10 items-center rounded-[6px] border border-[#b9e7c9] bg-[#effaf2] px-3 text-[13px] font-semibold text-[#176b3a]">
                    Assigned to you
                  </span>
                ) : (
                  <>
                    <span className="inline-flex h-10 items-center rounded-[6px] border border-[#d9deea] bg-[#fbfcfe] px-3 text-[13px] font-medium text-[#475467]">
                      Assigned to {assignedAgent?.label ?? "another agent"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          currentConversation.assigned_agent_id &&
                          window.confirm(
                            "Take over this conversation? The current agent will no longer be able to reply.",
                          )
                        ) {
                          void updateConversation({
                            action: "takeover",
                            expectedAssignedAgentId:
                              currentConversation.assigned_agent_id,
                          });
                        }
                      }}
                      disabled={
                        isConversationLoading || isCurrentConversationResolved
                      }
                      className="h-10 rounded-[6px] border border-brand-primary px-4 text-[13px] font-semibold text-brand-primary hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Take over
                    </button>
                  </>
                )}
                {isAssignedToCurrentAdmin ? (
                  <div className="relative shrink-0">
                    <select
                      value={currentConversation?.status ?? "active"}
                      onChange={(event) =>
                        void updateConversation({
                          status: event.target.value as Extract<
                            SupportConversationStatus,
                            "active" | "resolved"
                          >,
                        })
                      }
                      disabled={!currentConversation || isConversationLoading}
                      className="h-10 appearance-none rounded-[6px] border border-[#d9deea] bg-white py-0 pl-3 pr-10 text-[13px] font-medium capitalize text-[#344054] outline-none focus:border-brand-primary disabled:opacity-50"
                      aria-label="Conversation status"
                    >
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475467]" />
                  </div>
                ) : null}
              </div>
            ) : null}
            {supportError ? (
              <p
                role="alert"
                className="text-[13px] font-medium text-[#b42318]"
              >
                {supportError}
              </p>
            ) : null}
          </div>

          <div
            ref={chatViewportRef}
            onScroll={(event) => {
              const viewport = event.currentTarget;
              const atBottom =
                viewport.scrollHeight -
                  viewport.scrollTop -
                  viewport.clientHeight <
                80;
              setIsChatAtBottom(atBottom);
              if (atBottom) setHasNewMessagesBelow(false);
            }}
            className="scrollbar-hide min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#ffffff_18%,#f8fbff_100%)] px-3 py-4 sm:px-5 sm:py-5"
          >
            {supportMessages[0] ? (
              <MessageDayLabel createdAt={supportMessages[0].created_at} />
            ) : null}

            <div className="mt-5 grid gap-5">
              {isConversationLoading ? (
                <div className="grid gap-3" aria-label="Loading conversation">
                  <div className="h-16 w-3/4 animate-pulse rounded-[8px] bg-[#eef2f7]" />
                  <div className="ml-auto h-14 w-2/3 animate-pulse rounded-[8px] bg-brand-primary/8" />
                  <div className="h-20 w-4/5 animate-pulse rounded-[8px] bg-[#eef2f7]" />
                </div>
              ) : null}
              {supportMessages.map((message) => {
                const isAgent = message.sender === "agent";
                const isSystem = message.sender === "system";
                const isChatbot =
                  isSystem && message.sender_name === "Neatly Assistant";

                if (isSystem && !isChatbot) {
                  const proposal = decodeSupportBookingProposal(
                    message.content,
                  );
                  const bookingCode = message.content.match(
                    /Booking\s+(NB-[A-Z0-9-]+)/i,
                  )?.[1];
                  const booking = bookingCode
                    ? bookings.find(
                        (item) =>
                          item.bookingCode.toUpperCase() ===
                          bookingCode.toUpperCase(),
                      )
                    : undefined;

                  return (
                    <div
                      key={message.id}
                      className="grid justify-items-center gap-3"
                    >
                      <div className="max-w-[min(92%,36rem)] text-center text-[13px] leading-5 text-[#176b3a]">
                        {proposal
                          ? "Booking proposal sent to the customer."
                          : message.content}
                      </div>
                      {proposal ? (
                        <AdminBookingProposalCard proposal={proposal} />
                      ) : booking &&
                        (/ready for confirmation/i.test(message.content) ||
                          /created from the live support proposal/i.test(
                            message.content,
                          )) ? (
                        <ConversationBookingCard
                          booking={booking}
                          conversationId={message.conversation_id}
                          onCancelled={() => void refresh()}
                        />
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 sm:gap-3 ${
                      isAgent ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isAgent ? (
                      <span className="hidden sm:inline-flex">
                        <Avatar
                          initials={
                            isChatbot ? "NA" : (currentThread?.initials ?? "?")
                          }
                          accent={
                            isChatbot
                              ? "from-[#dcece3] to-[#f1f8f3]"
                              : (currentThread?.accent ??
                                "from-[#eef2f7] to-[#f8fafc]")
                          }
                        />
                      </span>
                    ) : null}

                    <div
                      className={`max-w-[min(80%,34rem)] ${isAgent ? "text-right" : "text-left"}`}
                    >
                      {isChatbot ? (
                        <div className="mb-1 pl-1 text-[12px] font-medium text-[#667085]">
                          Neatly Assistant
                        </div>
                      ) : null}
                      <div
                        className={`inline-block rounded-[10px] px-4 pt-3 pb-2 text-[15px] leading-7 shadow-sm ${
                          isAgent
                            ? "rounded-br-[4px] bg-brand-primary text-white"
                            : isChatbot
                              ? "rounded-bl-[4px] bg-[#eaf5ee] text-[#24563b]"
                              : "rounded-bl-[4px] bg-[#eef2f7] text-[#111827]"
                        }`}
                      >
                        <div>{message.content}</div>
                        <div
                          className={`mt-1 text-right text-[11px] leading-none ${
                            isAgent
                              ? "text-white/70"
                              : isChatbot
                                ? "text-[#24563b]/60"
                                : "text-[#667085]"
                          }`}
                        >
                          {new Intl.DateTimeFormat("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(message.created_at))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasNewMessagesBelow ? (
              <div className="sticky bottom-2 z-10 mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => scrollChatToBottom()}
                  className="rounded-full border border-[#cfd9ee] bg-white px-4 py-2 text-[13px] font-semibold text-brand-primary shadow-[0_8px_20px_rgba(15,23,42,0.14)] hover:bg-[#f7f9ff]"
                >
                  New messages &darr;
                </button>
              </div>
            ) : null}
          </div>

          {isCurrentConversationResolved && !isConversationLoading ? (
            <div className="flex shrink-0 flex-col gap-3 border-t border-[#edf0f5] bg-[#fbfcfe] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#344054]">
                  This conversation is resolved
                </p>
                <p className="mt-0.5 text-[12px] text-[#667085]">
                  {isAssignedToCurrentAdmin
                    ? "Reopen it before sending another message."
                    : "Only the assigned agent can reopen this conversation."}
                </p>
              </div>
              {isAssignedToCurrentAdmin ? (
                <button
                  type="button"
                  onClick={() => void updateConversation({ status: "active" })}
                  className="h-10 rounded-[6px] bg-brand-primary px-4 text-[13px] font-semibold text-white hover:bg-brand-primary-hover"
                >
                  Reopen conversation
                </button>
              ) : null}
            </div>
          ) : !isAssignedToCurrentAdmin &&
            currentConversation &&
            !isConversationLoading ? (
            <div className="flex shrink-0 flex-col items-center gap-3 border-t border-[#edf0f5] bg-[#fbfcfe] px-4 py-6 text-center">
              <p className="text-[13px] text-[#667085]">
                {currentConversation.assigned_agent_id
                  ? `This conversation is assigned to ${assignedAgent?.label ?? "another agent"}.`
                  : "Claim this conversation to reply"}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (currentConversation.assigned_agent_id) {
                    if (
                      window.confirm(
                        "Take over this conversation? The current agent will no longer be able to reply.",
                      )
                    ) {
                      void updateConversation({
                        action: "takeover",
                        expectedAssignedAgentId:
                          currentConversation.assigned_agent_id,
                      });
                    }
                  } else {
                    void updateConversation({ action: "claim" });
                  }
                }}
                disabled={isConversationLoading}
                className="flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-[6px] bg-brand-primary px-6 text-[15px] font-semibold text-white transition-transform hover:bg-brand-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChatBubbleIcon className="h-4 w-4" />
                {currentConversation.assigned_agent_id
                  ? "Take over conversation"
                  : "Claim conversation"}
              </button>
            </div>
          ) : (
            <form
              className="shrink-0 border-t border-[#edf0f5] bg-white px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4 sm:py-4"
              onSubmit={sendReply}
            >
              <div className="flex items-center gap-2 rounded-[8px] border border-[#d9deea] bg-[#fbfcfe] px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.03)] sm:gap-3 sm:px-4 sm:py-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-[#344054] outline-none placeholder:text-[#98A2B3]"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  disabled={
                    !currentConversation || isConversationLoading || isSending
                  }
                />

                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={
                    !reply.trim() ||
                    !currentConversation ||
                    isConversationLoading ||
                    isSending
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-primary text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SendIcon className="h-4.5 w-4.5" />
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {isDetailsOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Customer details"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#101828]/30 animate-[fade-in_150ms_ease-out]"
            onClick={() => setIsDetailsOpen(false)}
            aria-label="Close customer details"
          />
          <div className="relative flex h-full w-full max-w-[380px] flex-col overflow-y-auto border-l border-[#e7ebf2] bg-white p-5 shadow-[-12px_0_32px_rgba(15,23,42,0.12)] animate-[slide-in-right_200ms_ease-out] scrollbar-hide">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-[16px] font-semibold text-[#111827]">
                Customer details
              </h2>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#667085] hover:bg-[#f2f4f7]"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col divide-y divide-[#edf0f5]">
              <DetailsSection title="Customer Info" first>
                <div className="flex items-center gap-3">
                  <Avatar
                    initials={currentThread?.initials ?? "?"}
                    accent={
                      currentThread?.accent ?? "from-[#eef2f7] to-[#f8fafc]"
                    }
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[18px] font-semibold text-[#111827]">
                        {customer?.name ?? currentThread?.name ?? "Guest"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-[14px] text-[#475467]">
                  <InfoRow
                    icon={<MailIcon className="h-4 w-4" />}
                    text={customer?.email ?? "No email available"}
                  />
                  <InfoRow
                    icon={<PhoneIcon className="h-4 w-4" />}
                    text={
                      customer?.phone ??
                      currentConversation?.customer_phone ??
                      "No contact number provided"
                    }
                  />
                  <InfoRow
                    icon={<PinIcon className="h-4 w-4" />}
                    text={customer?.country ?? "No location available"}
                  />
                </div>

                <p className="mt-4 text-[14px] text-[#667085]">
                  {customer ? "Registered customer" : "Guest conversation"}
                </p>
              </DetailsSection>

              <DetailsSection title="Booking History">
                <div className="grid gap-3">
                  {bookings.length === 0 ? (
                    <p className="rounded-[8px] border border-dashed border-[#d9deea] p-4 text-center text-[14px] text-[#667085]">
                      No bookings linked to this conversation.
                    </p>
                  ) : (
                    bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-[8px] border border-[#e2e8f0] bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="rounded-full bg-[#eef1fb] px-2.5 py-1 text-[12px] font-semibold capitalize text-[#4d61a6]">
                            {booking.status}
                          </span>
                          <span className="text-[14px] font-semibold text-[#111827]">
                            THB {booking.totalAmount.toLocaleString("en-US")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[15px] font-semibold text-[#111827]">
                              {booking.roomType}
                            </p>
                            <p className="text-[13px] text-[#667085]">
                              {booking.checkIn} - {booking.checkOut}
                            </p>
                            <p className="text-[13px] text-[#667085]">
                              Booking #{booking.bookingCode}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DetailsSection>

              <DetailsSection title="Quick Actions">
                <button
                  type="button"
                  disabled={!currentConversation}
                  onClick={() => setIsCreateBookingOpen(true)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-[#d9deea] bg-white px-4 text-[14px] font-medium text-[#344054] transition-colors hover:border-[#b8c3dc] hover:bg-[#fbfcfe] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarIcon className="h-4 w-4 text-brand-primary" />
                  <span>Send Booking Proposal</span>
                </button>
              </DetailsSection>

              <DetailsSection title="AI Conversation Summary" last>
                {isCurrentConversationResolved && isAssignedToCurrentAdmin ? (
                  <button
                    type="button"
                    onClick={() =>
                      void updateConversation({ action: "regenerate_summary" })
                    }
                    disabled={isConversationLoading}
                    className="mb-3 text-[13px] font-semibold text-brand-primary hover:text-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Regenerate summary
                  </button>
                ) : null}
                <div className="rounded-[8px] bg-brand-primary/5 p-4 text-[14px] leading-6 whitespace-pre-line text-[#334a78]">
                  {currentConversation?.summary ??
                    "Summary will be generated when this conversation is resolved."}
                </div>
                {currentConversation?.summary_generated_at ? (
                  <p className="mt-3 text-[13px] text-[#667085]">
                    Generated{" "}
                    {new Intl.DateTimeFormat("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(
                      new Date(currentConversation.summary_generated_at),
                    )}
                  </p>
                ) : null}
              </DetailsSection>
            </div>
          </div>
        </div>
      ) : null}
      {isCreateBookingOpen && currentConversation && (
        <CreateBookingDialog
          conversation={currentConversation}
          onClose={() => setIsCreateBookingOpen(false)}
          onCreated={(supportMessage) => {
            setIsCreateBookingOpen(false);
            if (supportMessage) appendSupportMessage(supportMessage);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

type RoomOption = {
  id: string;
  name: string;
  guests: number;
  discountedPrice: number;
};

async function readBookingApiResponse<T extends object>(
  response: Response,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  // A missing route, proxy failure, or development error page is HTML. Avoid
  // showing its JSON parser exception to staff, since it hides the real issue.
  const body = await response.text();
  const preview = body.replace(/\s+/g, " ").slice(0, 120);
  throw new Error(
    `The booking service returned an unexpected response (${response.status}).${preview ? " Please try again or check the server logs." : ""}`,
  );
}

function CreateBookingDialog({
  conversation,
  onClose,
  onCreated,
}: {
  conversation: SupportConversation;
  onClose: () => void;
  onCreated: (supportMessage?: SupportMessage) => void;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [availableRooms, setAvailableRooms] = useState<RoomOption[]>([]);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function updateAvailabilityCriteria(update: () => void) {
    update();
    setAvailableRooms([]);
    setRoomTypeId("");
    setError("");
  }

  async function findAvailableRooms() {
    if (!checkIn || !checkOut) {
      setError("Select check-in and check-out dates.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        checkIn,
        checkOut,
        guests: String(guests),
        rooms: String(rooms),
      });
      const response = await fetch(`/api/live-support/admin/booking?${params}`);
      const data = await readBookingApiResponse<{
        rooms?: RoomOption[];
        error?: string;
        message?: string;
      }>(response);
      if (!response.ok)
        throw new Error(
          data.error ?? data.message ?? "Unable to check availability",
        );
      setAvailableRooms(data.rooms ?? []);
      setRoomTypeId(data.rooms?.[0]?.id ?? "");
      if (!data.rooms?.length)
        setError("No rooms are available for these dates.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to check availability",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function createBookingProposal(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!roomTypeId) {
      setError("Check availability and select a room type first.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/live-support/admin/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          proposal: { roomTypeId, checkIn, checkOut, guests, rooms },
        }),
      });
      const data = await readBookingApiResponse<{
        error?: string;
        message?: string;
        supportMessage?: SupportMessage;
      }>(response);
      if (!response.ok) {
        throw new Error(
          data.error ?? data.message ?? "Unable to send booking proposal",
        );
      }
      toast.success("Booking proposal sent.");
      onCreated(data.supportMessage);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to send booking proposal",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-booking-title"
    >
      <form
        onSubmit={createBookingProposal}
        className="max-h-[calc(100dvh-16px)] w-full max-w-3xl overflow-y-auto rounded-[8px] bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[92vh] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="create-booking-title"
              className="text-xl font-semibold text-[#111827]"
            >
              Send Booking Proposal
            </h2>
            <p className="mt-1 text-sm text-[#667085]">
              The customer completes their details, verification, requests, and
              payment in the standard booking flow.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-[#667085]"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BookingField label="Check-in">
            <input
              required
              type="date"
              value={checkIn}
              onChange={(event) =>
                updateAvailabilityCriteria(() => setCheckIn(event.target.value))
              }
            />
          </BookingField>
          <BookingField label="Check-out">
            <input
              required
              type="date"
              value={checkOut}
              onChange={(event) =>
                updateAvailabilityCriteria(() =>
                  setCheckOut(event.target.value),
                )
              }
            />
          </BookingField>
          <BookingField label="Guests">
            <input
              required
              type="number"
              min="1"
              max="8"
              value={guests}
              onChange={(event) =>
                updateAvailabilityCriteria(() =>
                  setGuests(Number(event.target.value)),
                )
              }
            />
          </BookingField>
          <BookingField label="Rooms">
            <input
              required
              type="number"
              min="1"
              max="3"
              value={rooms}
              onChange={(event) =>
                updateAvailabilityCriteria(() =>
                  setRooms(Number(event.target.value)),
                )
              }
            />
          </BookingField>
        </div>
        <button
          type="button"
          onClick={() => void findAvailableRooms()}
          disabled={isLoading}
          className="mt-3 rounded-[6px] border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary disabled:opacity-50"
        >
          Check availability
        </button>
        {availableRooms.length > 0 && (
          <div className="mt-3">
            <BookingField label="Available room type">
              <select
                required
                value={roomTypeId}
                onChange={(event) => setRoomTypeId(event.target.value)}
              >
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} &middot; THB{" "}
                    {room.discountedPrice.toLocaleString()} / night
                  </option>
                ))}
              </select>
            </BookingField>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#475467]"
          >
            Cancel
          </button>
          <button
            disabled={isLoading || !roomTypeId}
            className="flex items-center justify-center rounded-[6px] bg-brand-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </span>
            ) : (
              "Send proposal"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function BookingField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#344054]">
      <span>{label}</span>
      <span className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#d0d5dd] [&_input]:px-3 [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#d0d5dd] [&_select]:bg-white [&_select]:px-3">
        {children}
      </span>
    </label>
  );
}

function AdminBookingProposalCard({
  proposal,
}: {
  proposal: SupportBookingProposal;
}) {
  return (
    <article className="w-full max-w-[28rem] rounded-[8px] border border-[#d9e4fb] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-primary">
        Booking proposal
      </p>
      <h3 className="mt-1 text-[16px] font-semibold text-[#111827]">
        {proposal.roomName}
      </h3>
      <div className="mt-3 grid gap-1 text-[13px] text-[#667085] sm:grid-cols-2">
        <span>
          {proposal.checkIn} - {proposal.checkOut}
        </span>
        <span className="sm:text-right">
          {proposal.rooms} room(s) · {proposal.guests} guest(s)
        </span>
      </div>
      <p className="mt-3 border-t border-[#edf0f5] pt-3 text-[12px] text-[#667085]">
        Availability will be checked again when the customer completes the
        booking.
      </p>
    </article>
  );
}

function ConversationBookingCard({
  booking,
  conversationId,
  onCancelled,
}: {
  booking: SupportBooking;
  conversationId: string;
  onCancelled: () => void;
}) {
  const [isConfirmingCancellation, setIsConfirmingCancellation] =
    useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const canCancel =
    booking.status === "pending_payment" || booking.status === "confirmed";
  const isCancelled =
    booking.status === "cancelled" || booking.status === "refunded";

  async function cancelBooking() {
    if (isCancelling) return;
    setIsCancelling(true);
    setCancelError("");
    try {
      const response = await fetch("/api/live-support/admin/booking", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, bookingId: booking.id }),
      });
      const data = await readBookingApiResponse<{
        error?: string;
        message?: string;
      }>(response);
      if (!response.ok)
        throw new Error(
          data.error ?? data.message ?? "Unable to cancel booking",
        );
      setIsConfirmingCancellation(false);
      toast.success("Booking cancelled.");
      onCancelled();
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Unable to cancel booking",
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <article className="w-full max-w-[28rem] rounded-[8px] border border-[#d9e4fb] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-primary">
            Booking created
          </p>
          <h3 className="mt-1 text-[16px] font-semibold text-[#111827]">
            {booking.roomType}
          </h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${isCancelled ? "bg-[#fef3f2] text-[#b42318]" : "bg-[#fff1dc] text-[#9a6617]"}`}
        >
          {booking.status.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-1 text-[13px] text-[#667085] sm:grid-cols-2">
        <span>
          {booking.checkIn} - {booking.checkOut}
        </span>
        <span className="sm:text-right">
          THB {booking.totalAmount.toLocaleString("en-US")}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf0f5] pt-3">
        <span className="text-[12px] text-[#667085]">
          #{booking.bookingCode}
        </span>
        <div className="flex items-center gap-3">
          {canCancel ? (
            <button
              type="button"
              onClick={() => {
                setIsConfirmingCancellation(true);
                setCancelError("");
              }}
              className="text-[13px] font-semibold text-[#b42318] hover:text-[#912018]"
            >
              Cancel booking
            </button>
          ) : null}
          <Link
            href={`/customer-booking/${booking.id}`}
            className="text-[13px] font-semibold text-brand-primary hover:text-brand-primary-hover"
          >
            View booking
          </Link>
        </div>
      </div>
      {isConfirmingCancellation ? (
        <div className="mt-3 rounded-[8px] border border-[#fecdca] bg-[#fffbfa] p-3">
          <p className="text-[13px] font-semibold text-[#912018]">
            Cancel this booking?
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[#667085]">
            The guest will be notified in this conversation. An eligible paid
            booking will use the existing refund flow.
          </p>
          {cancelError ? (
            <p className="mt-2 text-[12px] text-[#b42318]">{cancelError}</p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => setIsConfirmingCancellation(false)}
              className="rounded-lg px-3 py-2 text-[12px] font-semibold text-[#475467] disabled:opacity-50"
            >
              Keep booking
            </button>
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => void cancelBooking()}
              className="flex items-center justify-center rounded-lg bg-[#b42318] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {isCancelling ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Cancelling...
                </span>
              ) : (
                "Yes, cancel booking"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DetailsSection({
  title,
  first,
  last,
  children,
}: {
  title: string;
  first?: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${first ? "pt-0" : "pt-5"} ${last ? "pb-0" : "pb-5"}`}>
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Avatar({
  initials,
  accent,
  size = "md",
}: {
  initials: string;
  accent: string;
  size?: "md" | "lg";
}) {
  const sizeClasses =
    size === "lg" ? "h-16 w-16 text-[20px]" : "h-10 w-10 text-[14px]";

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${accent} font-semibold text-[#1f3c88] ${sizeClasses}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function initialsForName(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return initials.toUpperCase() || "?";
}

function avatarAccent(seed: string) {
  const accents = [
    "from-[#dbe7ff] to-[#eef4ff]",
    "from-[#e4ede8] to-[#f4f7f5]",
    "from-[#ece7ff] to-[#f6f3ff]",
    "from-[#f0e9de] to-[#faf7f0]",
    "from-[#e0f0ee] to-[#f5fbfa]",
  ];
  const index =
    [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) %
    accents.length;
  return accents[index];
}

function conversationStatusLabel(
  status: SupportConversationStatus | undefined,
) {
  if (status === "resolved") return "Resolved";
  if (status === "active") return "Active";
  return "Waiting for an agent";
}

function conversationStatusDotClass(
  status: SupportConversationStatus | undefined,
) {
  if (status === "resolved") return "bg-[#98A2B3]";
  if (status === "active") return "bg-[#24B05A]";
  return "bg-[#F79009]";
}

// Today shows the time (most useful at a glance); older than that, a bare
// time is actively misleading — "10:22" reads as "this morning" even if the
// last message was three days ago. Same convention as WhatsApp/Gmail.
function formatThreadTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (dayDiff <= 0) {
    return new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7)
    return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function MessageDayLabel({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const label = isToday
    ? "Today"
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);

  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-[#f2f4f8] px-3 py-1 text-[12px] font-medium text-[#667085]">
        {label}
      </span>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f2f4f7] text-[#667085]">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="11"
        cy="11"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m16.2 16.2 3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m15 18-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// No circle of its own — the button it sits in is already round
// (rounded-full), so an outlined circle here doubled up with it.
function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 11.5 20.5 4 13 20.5l-2.3-6.8L3 11.5Z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 17v-7M12 7.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Inlined from public/icons/icon/customer-live-support.svg — fill swapped
// from its original hardcoded #000000 to currentColor so the badge's
// Tailwind text-color class (green when active, gray when not) drives the
// icon's color too, same mechanism every other icon in this file uses.
function CustomerLiveSupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <g transform="translate(0,64) scale(0.1,-0.1)" fill="currentColor" stroke="none">
        <path d="M247 603 c-4 -3 -7 -46 -7 -94 0 -63 -4 -90 -14 -96 -7 -4 -18 -18 -25 -30 -37 -71 26 -152 108 -139 33 5 41 2 67 -25 26 -27 34 -30 79 -27 39 2 50 0 50 -12 0 -12 -12 -14 -57 -12 l-58 4 0 -36 0 -36 -99 0 -99 0 -4 55 c-3 39 -14 70 -37 107 -59 95 -55 165 15 234 45 46 51 54 35 54 -20 0 -75 -56 -92 -95 -33 -72 -25 -114 42 -235 12 -22 19 -54 19 -87 l0 -53 120 0 120 0 0 36 0 35 51 -3 c40 -2 54 1 63 15 20 32 -4 52 -59 49 -40 -3 -52 1 -76 24 -27 25 -27 28 -14 55 8 15 15 37 15 48 0 56 -64 116 -96 90 -21 -17 -17 -35 11 -53 14 -9 25 -25 25 -36 0 -24 -13 -26 -30 -5 -7 8 -25 15 -41 15 -19 0 -29 -5 -29 -15 0 -23 39 -56 63 -55 35 3 43 0 27 -10 -26 -17 -60 -11 -85 15 -33 32 -33 78 0 111 23 23 25 33 25 109 0 50 4 85 10 85 6 0 10 -8 10 -19 0 -14 10 -20 40 -25 67 -11 140 -91 140 -156 0 -11 10 -35 23 -51 l22 -31 -22 -18 c-23 -18 -32 -60 -13 -60 6 0 10 9 10 20 0 11 4 20 8 20 5 0 17 6 27 14 19 13 18 15 -8 55 -15 22 -27 49 -27 58 -1 33 -37 98 -69 126 -18 14 -49 32 -71 38 -23 7 -40 19 -43 30 -5 18 -37 26 -50 12z m117 -235 c10 -29 1 -78 -15 -78 -6 0 -7 13 -3 35 5 28 2 38 -20 58 -14 13 -23 27 -19 31 11 10 47 -19 57 -46z m-74 -53 c10 -12 10 -15 -3 -15 -8 0 -20 7 -27 15 -10 12 -10 15 3 15 8 0 20 -7 27 -15z" />
      </g>
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5v-3.5h-.5A2.5 2.5 0 0 1 4 13.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.5 17.5a2.5 2.5 0 0 1-5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 17H6.5a1 1 0 0 1-.9-1.45l1.1-2.2V10a5.3 5.3 0 0 1 10.6 0v3.35l1.1 2.2A1 1 0 0 1 18 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 4v3M16 4v3M4 9.5h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m5 8 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s5-4.2 5-9a5 5 0 1 0-10 0c0 4.8 5 9 5 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="1.6" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 4.8 9.8 7a1.2 1.2 0 0 1 0 1.7l-1.6 1.6a12 12 0 0 0 5.5 5.5l1.6-1.6a1.2 1.2 0 0 1 1.7 0l2.2 2.2a1.2 1.2 0 0 1 0 1.7l-1.4 1.4a2 2 0 0 1-2.1.5A18 18 0 0 1 5.6 8.3a2 2 0 0 1 .5-2.1l1.4-1.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
