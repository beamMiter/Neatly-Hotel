"use client";

import { FormEvent, useState } from "react";
import type { ChatbotSettings, ChatbotSuggestion, ChatbotSuggestionTranslation } from "@/types/chatbot";
import {
  createChatbotSuggestion,
  deleteChatbotSuggestion,
  saveChatbotSettings,
  updateChatbotSuggestion,
} from "@/lib/chatbot-admin-api";

type PresetTopic = {
  id: string;
  format: "Room type" | "Message" | "Option with details";
  rooms?: string[];
  translations: Record<"th" | "en", LocalizedTopic>;
};

type LocalizedTopic = Omit<ChatbotSuggestionTranslation, "button_name"> & { buttonName?: string };

const emptyLocalizedTopic = (): LocalizedTopic => ({ topic: "", reply: "", buttonName: "", options: [] });

function localizedTopic(topic: Pick<ChatbotSuggestion, "topic" | "reply" | "button_name" | "options">): LocalizedTopic {
  return {
    topic: topic.topic,
    reply: topic.reply,
    buttonName: topic.button_name ?? "",
    options: topic.options.map((option) => ({ ...option })),
  };
}

const defaultTopics = [
  { id: "room-types", topic: "Room Types", format: "Room type", reply: "Neatly Hotel offers a variety of room types to suit your needs! 🏨✨ Here are the options", buttonName: "View Details" },
  { id: "booking", topic: "Booking", format: "Room type", reply: "Let's get your booking started First, please choose the type of room you'd like 🛏️✨", buttonName: "Book Now" },
  { id: "check-times", topic: "Check-in & Check-out Time", format: "Message", reply: "Great! 😊 Here are our check-in and check-out times:\nCheck-in time: From 2:00 PM onwards 🕑\nCheck-out time: By 12:00 PM 🕛" },
  { id: "payment", topic: "Payment methods", format: "Option with details", reply: "Here are the payment methods we accept. Tap to see more details 💳💵", options: [{ name: "Credit Card", details: "We accept credit cards including Visa and MasterCard." }, { name: "Cash", details: "You can pay at the hotel with cash or cheque. No payment is required until check-in." }] },
  { id: "promotion", topic: "Promotion", format: "Room type", reply: "🎉 Our promotion this month. Get 10% off 🌞 when you book your stay within this month. Don't miss out!", buttonName: "Book Now" },
];

function DragIcon() {
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true"><path d="M10 9C9.46957 9 8.96086 8.78929 8.58579 8.41421C8.21071 8.03914 8 7.53043 8 7C8 6.46957 8.21071 5.96086 8.58579 5.58579C8.96086 5.21071 9.46957 5 10 5C10.5304 5 11.0391 5.21071 11.4142 5.58579C11.7893 5.96086 12 6.46957 12 7C12 7.53043 11.7893 8.03914 11.4142 8.41421C11.0391 8.78929 10.5304 9 10 9ZM10 15C9.46957 15 8.96086 14.7893 8.58579 14.4142C8.21071 14.0391 8 13.5304 8 13C8 12.4696 8.21071 11.9609 8.58579 11.5858C8.96086 11.2107 9.46957 11 10 11C10.5304 11 11.0391 11.2107 11.4142 11.5858C11.7893 11.9609 12 12.4696 12 13C12 13.5304 11.7893 14.0391 11.4142 14.4142C11.0391 14.7893 10.5304 15 10 15ZM10 21C9.46957 21 8.96086 20.7893 8.58579 20.4142C8.21071 20.0391 8 19.5304 8 19C8 18.4696 8.21071 17.9609 8.58579 17.5858C8.96086 17.2107 9.46957 17 10 17C10.5304 17 11.0391 17.2107 11.4142 17.5858C11.7893 17.9609 12 18.4696 12 19C12 19.5304 11.7893 20.0391 11.4142 20.4142C11.0391 20.7893 10.5304 21 10 21Z" fill="#646D89"/><path d="M16 9C15.4696 9 14.9609 8.78929 14.5858 8.41421C14.2107 8.03914 14 7.53043 14 7C14 6.46957 14.2107 5.96086 14.5858 5.58579C14.9609 5.21071 15.4696 5 16 5C16.5304 5 17.0391 5.21071 17.4142 5.58579C17.7893 5.96086 18 6.46957 18 7C18 7.53043 17.7893 8.03914 17.4142 8.41421C17.0391 8.78929 16.5304 9 16 9ZM16 15C15.4696 15 14.9609 14.7893 14.5858 14.4142C14.2107 14.0391 14 13.5304 14 13C14 12.4696 14.2107 11.9609 14.5858 11.5858C14.9609 11.2107 15.4696 11 16 11C16.5304 11 17.0391 11.2107 17.4142 11.5858C17.7893 11.9609 18 12.4696 18 13C18 13.5304 17.7893 14.0391 17.4142 14.4142C17.0391 14.7893 16.5304 15 16 15ZM16 21C15.4696 21 14.9609 20.7893 14.5858 20.4142C14.2107 20.0391 14 19.5304 14 19C14 18.4696 14.2107 17.9609 14.5858 17.5858C14.9609 17.2107 15.4696 17 16 17C16.5304 17 17.0391 17.2107 17.4142 17.5858C17.7893 17.9609 18 18.4696 18 19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21Z" fill="#646D89"/></svg>;
}

function EditIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10.6903 2.01003C11.0493 1.65096 11.5314 1.44187 12.0389 1.42516C12.5464 1.40844 13.0412 1.58536 13.423 1.92003L13.519 2.01003L13.9903 2.48137C14.3492 2.84031 14.5582 3.32229 14.5749 3.82959C14.5916 4.3369 14.4148 4.83158 14.0803 5.21337L13.9903 5.30937L6.51567 12.7847C6.40999 12.8904 6.28196 12.971 6.141 13.0207L6.033 13.052L3.06367 13.7374C2.95965 13.7614 2.85137 13.7601 2.74794 13.7337C2.64451 13.7072 2.54895 13.6563 2.46926 13.5852C2.38958 13.5142 2.32811 13.425 2.29002 13.3253C2.25193 13.2255 2.23832 13.1181 2.25034 13.012L2.26367 12.9367L2.94834 9.9667C2.98216 9.82102 3.04823 9.68479 3.14167 9.56803L3.21567 9.4847L10.6903 2.01003ZM10.219 4.3667L4.22567 10.36L3.80167 12.1987L5.64034 11.774L11.6337 5.7807L10.219 4.3667ZM12.5763 2.9527C12.4615 2.83792 12.3088 2.76896 12.1468 2.75877C11.9848 2.74859 11.8246 2.79787 11.6963 2.89737L11.6337 2.9527L11.1617 3.42403L12.5763 4.83803L13.0477 4.3667C13.1625 4.2519 13.2314 4.09917 13.2416 3.93715C13.2518 3.77514 13.2025 3.61497 13.103 3.4867L13.0477 3.42403L12.5763 2.9527Z" fill="#646D89"/></svg>;
}

function DeleteIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.3333 3.33337C13.4209 3.33337 13.5076 3.35062 13.5885 3.38412C13.6693 3.41762 13.7428 3.46673 13.8047 3.52864C13.8666 3.59054 13.9157 3.66403 13.9493 3.74492C13.9828 3.8258 14 3.91249 14 4.00004C14 4.08759 13.9828 4.17428 13.9493 4.25516C13.9157 4.33605 13.8666 4.40954 13.8047 4.47145C13.7428 4.53335 13.6693 4.58246 13.5885 4.61596C13.5076 4.64946 13.4209 4.66671 13.3333 4.66671H12.6667L12.6647 4.71404L12.0427 13.428C12.0187 13.7644 11.8682 14.0792 11.6214 14.3091C11.3746 14.5389 11.0499 14.6667 10.7127 14.6667H5.28667C4.94943 14.6667 4.62471 14.5389 4.37792 14.3091C4.13114 14.0792 3.98061 13.7644 3.95667 13.428L3.33467 4.71471C3.33366 4.69873 3.33321 4.68272 3.33333 4.66671H2.66667C2.48986 4.66671 2.32029 4.59647 2.19526 4.47145C2.07024 4.34642 2 4.17685 2 4.00004C2 3.82323 2.07024 3.65366 2.19526 3.52864C2.32029 3.40361 2.48986 3.33337 2.66667 3.33337H13.3333ZM11.3313 4.66671H4.66867L5.28733 13.3334H10.7127L11.3313 4.66671ZM9.33333 1.33337C9.51014 1.33337 9.67971 1.40361 9.80474 1.52864C9.92976 1.65366 10 1.82323 10 2.00004C10 2.17685 9.92976 2.34642 9.80474 2.47145C9.67971 2.59647 9.51014 2.66671 9.33333 2.66671H6.66667C6.48986 2.66671 6.32029 2.59647 6.19526 2.47145C6.07024 2.34642 6 2.17685 6 2.00004C6 1.82323 6.07024 1.65366 6.19526 1.52864C6.32029 1.40361 6.48986 1.33337 6.66667 1.33337H9.33333Z" fill="#646D89"/></svg>;
}

function FieldError({ children = "Please fill in this field" }: { children?: string }) {
  return <span className="text-xs leading-4 text-[#D8294A]">{children}</span>;
}

function fromSuggestion(topic: ChatbotSuggestion): PresetTopic {
  const fallback = localizedTopic(topic);
  return {
    id: topic.id,
    format: topic.format,
    rooms: topic.rooms,
    translations: {
      th: topic.translations?.th ? { ...topic.translations.th, buttonName: topic.translations.th.button_name ?? "", options: topic.translations.th.options.map((option) => ({ ...option })) } : { ...fallback, options: fallback.options.map((option) => ({ ...option })) },
      en: topic.translations?.en ? { ...topic.translations.en, buttonName: topic.translations.en.button_name ?? "", options: topic.translations.en.options.map((option) => ({ ...option })) } : { ...fallback, options: fallback.options.map((option) => ({ ...option })) },
    },
  };
}

function toSuggestion(topic: PresetTopic, sortOrder: number) {
  const en = topic.translations.en;
  return {
    id: topic.id,
    topic: en.topic,
    format: topic.format,
    reply: en.reply,
    button_name: en.buttonName?.trim() || null,
    rooms: topic.rooms ?? [],
    options: en.options,
    translations: Object.fromEntries((Object.entries(topic.translations) as Array<["th" | "en", LocalizedTopic]>).map(([locale, translation]) => [locale, {
      topic: translation.topic,
      reply: translation.reply,
      button_name: translation.buttonName?.trim() || null,
      options: translation.options,
    }])),
    is_active: true,
    sort_order: sortOrder,
  };
}

export default function FaqManager({ initialSettings, initialSuggestions, roomTypes }: { initialSettings: ChatbotSettings; initialSuggestions: ChatbotSuggestion[]; roomTypes: string[] }) {
  const selectableRoomTypes = Array.from(new Set([
    ...roomTypes,
    ...initialSuggestions.flatMap((suggestion) => suggestion.rooms),
  ]));
  const [settings, setSettings] = useState(initialSettings);
  const [messageLocale, setMessageLocale] = useState<"th" | "en">("th");
  const [suggestionLocales, setSuggestionLocales] = useState<Record<string, "th" | "en">>({});
  const [newSuggestionLocale, setNewSuggestionLocale] = useState<"th" | "en">("th");
  const [newTranslations, setNewTranslations] = useState<Record<"th" | "en", LocalizedTopic>>({ th: emptyLocalizedTopic(), en: emptyLocalizedTopic() });
  const [isSaving, setIsSaving] = useState(false);
  const [presetTopics, setPresetTopics] = useState(initialSuggestions.length ? initialSuggestions.map(fromSuggestion) : defaultTopics.map((topic) => fromSuggestion({ ...topic, format: topic.format as PresetTopic["format"], rooms: topic.format === "Room type" ? [...selectableRoomTypes] : [], options: topic.options ?? [], button_name: topic.buttonName ?? null, is_active: true, sort_order: 0 })));
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newReplyFormat, setNewReplyFormat] = useState<PresetTopic["format"] | "">("");
  const [newReplyMessage, setNewReplyMessage] = useState("");
  const [newReplyTitle, setNewReplyTitle] = useState("");
  const [newOptions, setNewOptions] = useState([{ name: "", details: "" }]);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [newButtonName, setNewButtonName] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [editingRoomSearch, setEditingRoomSearch] = useState("");
  const [isEditingRoomDropdownOpen, setIsEditingRoomDropdownOpen] = useState(false);
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<PresetTopic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<PresetTopic | null>(null);
  const [showNewTopicErrors, setShowNewTopicErrors] = useState(false);
  function addPresetTopic() {
    if (editingTopic) return;
    setNewTopic("");
    setNewReplyFormat("");
    setNewReplyMessage("");
    setNewReplyTitle("");
    setNewOptions([{ name: "", details: "" }]);
    setNewRoomTitle("");
    setSelectedRooms([]);
    setNewButtonName("");
    setNewSuggestionLocale("th");
    setNewTranslations({ th: emptyLocalizedTopic(), en: emptyLocalizedTopic() });
    setRoomSearch("");
    setIsRoomDropdownOpen(false);
    setShowNewTopicErrors(false);
    setIsAddingTopic(true);
  }

  async function savePresetTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowNewTopicErrors(true);
    const currentTranslation: LocalizedTopic = {
      topic: newTopic.trim(),
      reply: (newReplyFormat === "Option with details" ? newReplyTitle : newReplyFormat === "Room type" ? newRoomTitle : newReplyMessage).trim(),
      buttonName: newButtonName.trim(),
      options: newOptions.map((option) => ({ name: option.name.trim(), details: option.details.trim() })),
    };
    const translations = { ...newTranslations, [newSuggestionLocale]: currentTranslation };
    const hasInvalidTranslation = Object.values(translations).some((translation) =>
      !translation.topic || !translation.reply ||
      (newReplyFormat === "Room type" && !translation.buttonName) ||
      (newReplyFormat === "Option with details" && (!translation.options.length || translation.options.some((option) => !option.name || !option.details))),
    );
    if (!newReplyFormat || hasInvalidTranslation || (newReplyFormat === "Room type" && selectedRooms.length === 0)) return;
    const topic = { id: `topic-${crypto.randomUUID()}`, format: newReplyFormat, rooms: newReplyFormat === "Room type" ? selectedRooms : [], translations } satisfies PresetTopic;
    try { await createChatbotSuggestion(toSuggestion(topic, presetTopics.length) as Omit<ChatbotSuggestion, "created_at" | "updated_at">); } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to save suggestion"); return; }
    setSaveError("");
    setPresetTopics((current) => [...current, topic]);
    setIsAddingTopic(false);
    setNewTopic("");
    setNewReplyFormat("");
    setNewReplyMessage("");
    setNewReplyTitle("");
    setNewOptions([{ name: "", details: "" }]);
    setNewRoomTitle("");
    setSelectedRooms([]);
    setNewButtonName("");
    setRoomSearch("");
    setIsRoomDropdownOpen(false);
    setShowNewTopicErrors(false);
  }

  function cancelPresetTopic() {
    setIsAddingTopic(false);
    setNewTopic("");
    setNewReplyFormat("");
    setNewReplyMessage("");
    setNewReplyTitle("");
    setNewOptions([{ name: "", details: "" }]);
    setNewRoomTitle("");
    setSelectedRooms([]);
    setNewButtonName("");
    setNewSuggestionLocale("th");
    setNewTranslations({ th: emptyLocalizedTopic(), en: emptyLocalizedTopic() });
    setRoomSearch("");
    setIsRoomDropdownOpen(false);
    setShowNewTopicErrors(false);
  }

  function toggleRoom(room: string) {
    setSelectedRooms((current) => current.includes(room) ? current.filter((item) => item !== room) : [...current, room]);
  }

  function startEditingTopic(topic: PresetTopic) {
    if (isAddingTopic || editingTopic) return;
    setEditingTopic({
      ...topic,
      rooms: topic.rooms ? [...topic.rooms] : undefined,
      translations: {
        th: { ...topic.translations.th, options: topic.translations.th.options.map((option) => ({ ...option })) },
        en: { ...topic.translations.en, options: topic.translations.en.options.map((option) => ({ ...option })) },
      },
    });
    setEditingRoomSearch("");
    setIsEditingRoomDropdownOpen(false);
  }

  async function saveEditingTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTopic || Object.values(editingTopic.translations).some((translation) => !translation.topic.trim() || !translation.reply.trim() || (editingTopic.format === "Room type" && !translation.buttonName?.trim()) || (editingTopic.format === "Option with details" && (!translation.options.length || !translation.options.every((option) => option.name.trim() && option.details.trim()))))) return;
    if (editingTopic.format === "Room type" && !editingTopic.rooms?.length) return;
    const updated = {
      ...editingTopic,
      translations: Object.fromEntries((Object.entries(editingTopic.translations) as Array<["th" | "en", LocalizedTopic]>).map(([locale, translation]) => [locale, {
        ...translation,
        topic: translation.topic.trim(),
        reply: translation.reply.trim(),
        buttonName: translation.buttonName?.trim(),
        options: translation.options.map((option) => ({ name: option.name.trim(), details: option.details.trim() })),
      }])) as Record<"th" | "en", LocalizedTopic>,
    };
    const sortOrder = presetTopics.findIndex((topic) => topic.id === updated.id);
    try { await updateChatbotSuggestion(updated.id, toSuggestion(updated, sortOrder)); } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to save suggestion"); return; }
    setSaveError("");
    setPresetTopics((current) => current.map((topic) => topic.id === updated.id ? updated : topic));
    setEditingTopic(null);
    setIsEditingRoomDropdownOpen(false);
  }

  function changeEditingFormat(format: PresetTopic["format"]) {
    setEditingTopic((current) => current ? {
      ...current,
      format,
      rooms: format === "Room type" ? (current.rooms?.length ? current.rooms : [...selectableRoomTypes]) : undefined,
      translations: Object.fromEntries((Object.entries(current.translations) as Array<["th" | "en", LocalizedTopic]>).map(([locale, translation]) => [locale, {
        ...translation,
        buttonName: format === "Room type" ? (translation.buttonName ?? "") : "",
        options: format === "Option with details" ? (translation.options.length ? translation.options : [{ name: "", details: "" }]) : [],
      }])) as Record<"th" | "en", LocalizedTopic>,
    } : current);
  }

  function toggleEditingRoom(room: string) {
    setEditingTopic((current) => {
      if (!current) return current;
      const currentRooms = current.rooms ?? [];
      return {
        ...current,
        rooms: currentRooms.includes(room)
          ? currentRooms.filter((item) => item !== room)
          : [...currentRooms, room],
      };
    });
  }

  async function confirmDeleteTopic() {
    if (!deletingTopic) return;
    try { await deleteChatbotSuggestion(deletingTopic.id); } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to delete suggestion"); return; }
    setSaveError("");
    setPresetTopics((current) => current.filter((topic) => topic.id !== deletingTopic.id));
    setDeletingTopic(null);
  }

  async function moveTopic(targetTopicId: string) {
    if (!draggedTopicId || draggedTopicId === targetTopicId) return;
    const sourceIndex = presetTopics.findIndex((topic) => topic.id === draggedTopicId);
    const targetIndex = presetTopics.findIndex((topic) => topic.id === targetTopicId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const reordered = [...presetTopics];
      const [movedTopic] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, movedTopic);
    setPresetTopics(reordered);
    try { await Promise.all(reordered.map((topic, index) => updateChatbotSuggestion(topic.id, { sort_order: index }))); setSaveError(""); } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to reorder suggestions"); }
    setDraggedTopicId(null);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveSuccess("");
    try {
      const result = await saveChatbotSettings({
        greeting_message: settings.greeting_message.trim(),
        auto_reply_message: settings.auto_reply_message.trim(),
        greeting_message_th: settings.greeting_message_th.trim(),
        greeting_message_en: settings.greeting_message_en.trim(),
        auto_reply_message_th: settings.auto_reply_message_th.trim(),
        auto_reply_message_en: settings.auto_reply_message_en.trim(),
      });
      setSettings(result.settings);
      setSaveError("");
      setSaveSuccess("บันทึกข้อความเรียบร้อยแล้ว");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save settings");
    }
    setIsSaving(false);
  }

  function updateEditingTranslation(locale: "th" | "en", update: Partial<LocalizedTopic>) {
    setEditingTopic((current) => current ? {
      ...current,
      translations: { ...current.translations, [locale]: { ...current.translations[locale], ...update } },
    } : current);
  }

  function changeNewSuggestionLocale(locale: "th" | "en") {
    const currentTranslation: LocalizedTopic = {
      topic: newTopic,
      reply: newReplyFormat === "Option with details" ? newReplyTitle : newReplyFormat === "Room type" ? newRoomTitle : newReplyMessage,
      buttonName: newButtonName,
      options: newOptions,
    };
    const next = newTranslations[locale];
    setNewTranslations((current) => ({ ...current, [newSuggestionLocale]: currentTranslation }));
    setNewSuggestionLocale(locale);
    setNewTopic(next.topic);
    setNewReplyMessage(newReplyFormat === "Message" ? next.reply : "");
    setNewReplyTitle(newReplyFormat === "Message" ? "" : next.reply);
    setNewOptions(next.options.length ? next.options : [{ name: "", details: "" }]);
    setNewRoomTitle(newReplyFormat === "Room type" ? next.reply : "");
    setNewButtonName(next.buttonName ?? "");
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#F7F8FA] text-[#2e3442]">
      {saveError && <div className="fixed top-4 right-4 z-50 max-w-md rounded bg-[#D8294A] px-4 py-3 text-sm text-white">Save failed: {saveError}</div>}
      <header className="flex h-[72px] w-full shrink-0 items-center border-b border-[#E4E6ED] bg-white px-10">
        <h1 className="text-[20px] font-medium text-[#222222]">Chatbot Setup</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <section className="flex w-full max-w-[1080px] flex-col items-start gap-10 rounded-lg border border-[#E4E6ED] bg-white p-8 max-md:p-5">
            <form className="grid w-full gap-10" onSubmit={saveSettings}>
              <div className="flex w-full flex-wrap items-center justify-between gap-4">
                <h2 className="m-0 text-xl leading-[30px] font-semibold tracking-[-.02em] text-[#9AA1B9]">Default Chatbot Messages</h2>
                <div className="flex rounded-md border border-[#D6D9E4] bg-white p-0.5 text-sm font-semibold text-[#646D89]" aria-label="Message language">
                  <button type="button" onClick={() => setMessageLocale("th")} className={`rounded px-3 py-1.5 ${messageLocale === "th" ? "bg-[#E8F0EB] text-[#365A46] shadow-sm" : "hover:text-[#365A46]"}`}>ไทย</button>
                  <button type="button" onClick={() => setMessageLocale("en")} className={`rounded px-3 py-1.5 ${messageLocale === "en" ? "bg-[#E8F0EB] text-[#365A46] shadow-sm" : "hover:text-[#365A46]"}`}>English</button>
                </div>
              </div>
              {messageLocale === "th" ? (
                <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Greeting message (ไทย) *<textarea className="h-24 w-full resize-none rounded-sm border border-[#D6D9E4] bg-white px-3 pt-3 pr-4 text-base leading-6 text-black outline-none focus:border-[#729280]" required value={settings.greeting_message_th} onChange={(event) => { setSettings({ ...settings, greeting_message_th: event.target.value }); setSaveSuccess(""); }} /></label>
              ) : (
                <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Greeting message (English) *<textarea className="h-24 w-full resize-none rounded-sm border border-[#D6D9E4] bg-white px-3 pt-3 pr-4 text-base leading-6 text-black outline-none focus:border-[#729280]" required value={settings.greeting_message_en} onChange={(event) => { setSettings({ ...settings, greeting_message_en: event.target.value }); setSaveSuccess(""); }} /></label>
              )}
              <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">
                ข้อความเมื่อไม่พบคำตอบ *
                <textarea className="h-24 w-full resize-none rounded-sm border border-[#D6D9E4] bg-white px-3 pt-3 pr-4 text-base leading-6 text-black outline-none focus:border-[#729280] focus:ring-2 focus:ring-[#729280]/10" required value={settings.auto_reply_message} onChange={(event) => { setSettings({ ...settings, auto_reply_message: event.target.value }); setSaveSuccess(""); }} />
                <span className="text-xs leading-5 text-[#646D89]">ระบบจะแสดงข้อความนี้ตามที่ตั้งไว้เมื่อไม่สามารถตอบคำถามได้ พร้อมปุ่มถามใหม่และคุยกับเจ้าหน้าที่</span>
              </label>
              {messageLocale === "th" ? (
                <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Fallback message (ไทย) *<textarea className="h-24 w-full resize-none rounded-sm border border-[#D6D9E4] bg-white px-3 pt-3 pr-4 text-base leading-6 text-black outline-none focus:border-[#729280]" required value={settings.auto_reply_message_th} onChange={(event) => { setSettings({ ...settings, auto_reply_message_th: event.target.value }); setSaveSuccess(""); }} /></label>
              ) : (
                <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Fallback message (English) *<textarea className="h-24 w-full resize-none rounded-sm border border-[#D6D9E4] bg-white px-3 pt-3 pr-4 text-base leading-6 text-black outline-none focus:border-[#729280]" required value={settings.auto_reply_message_en} onChange={(event) => { setSettings({ ...settings, auto_reply_message_en: event.target.value }); setSaveSuccess(""); }} /></label>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <button className="h-12 w-fit cursor-pointer rounded-sm bg-[#C14817] px-8 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-50" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Messages"}</button>
                {saveSuccess && <p className="m-0 text-sm font-medium text-[#527865]" role="status">{saveSuccess}</p>}
              </div>
            </form>

            <div className="h-px w-full bg-[#E4E6ED]" />

            <div className="flex w-full items-center justify-between gap-4"><h2 className="m-0 text-xl leading-[30px] font-semibold tracking-[-.02em] text-[#9AA1B9]">Suggestion menu &amp; Response</h2></div>

            <div className="grid w-full gap-6">
              {presetTopics.map((topic) => {
                const isEditing = editingTopic?.id === topic.id;
                const displayedTopic = isEditing ? editingTopic : topic;
                const suggestionLocale = suggestionLocales[topic.id] ?? "th";
                const displayedTranslation = displayedTopic.translations[suggestionLocale];
                const isAnotherTopicEditing = Boolean(editingTopic && !isEditing);
                return (
                <form className={`relative flex w-full items-start gap-6 rounded-lg bg-[#F6F7FC] p-6 pt-16 transition-opacity ${draggedTopicId === topic.id || isAnotherTopicEditing ? "opacity-50" : "opacity-100"}`} key={topic.id} onSubmit={saveEditingTopic} draggable={!editingTopic} onDragStart={() => { if (!editingTopic) setDraggedTopicId(topic.id); }} onDragOver={(event) => { if (!editingTopic) event.preventDefault(); }} onDrop={() => moveTopic(topic.id)} onDragEnd={() => setDraggedTopicId(null)}>
                  <div className="absolute top-4 right-4 flex rounded-md border border-[#D6D9E4] bg-white p-0.5 text-sm font-semibold text-[#646D89]" aria-label={`Suggestion language for ${displayedTranslation.topic}`}>
                    <button type="button" onClick={() => setSuggestionLocales((current) => ({ ...current, [topic.id]: "th" }))} className={`rounded px-3 py-1.5 ${suggestionLocale === "th" ? "bg-[#E8F0EB] text-[#365A46] shadow-sm" : "hover:text-[#365A46]"}`}>ไทย</button>
                    <button type="button" onClick={() => setSuggestionLocales((current) => ({ ...current, [topic.id]: "en" }))} className={`rounded px-3 py-1.5 ${suggestionLocale === "en" ? "bg-[#E8F0EB] text-[#365A46] shadow-sm" : "hover:text-[#365A46]"}`}>English</button>
                  </div>
                  <fieldset className="grid min-w-0 flex-1 gap-6 border-0 p-0" disabled={!isEditing}>
                    <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1 max-md:gap-6">
                      <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Topic *<input className="h-12 rounded-lg border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" required value={displayedTranslation.topic} onChange={(event) => updateEditingTranslation(suggestionLocale, { topic: event.target.value })} /></label>
                      <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Reply format<select className="h-12 rounded-sm border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" value={displayedTopic.format} onChange={(event) => changeEditingFormat(event.target.value as PresetTopic["format"])}><option>Room type</option><option>Message</option><option>Option with details</option></select></label>
                    </div>

                    <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">{displayedTopic.format === "Message" ? "Reply message" : "Reply title"}<textarea className={`${displayedTopic.format === "Message" ? "h-24" : "h-12"} w-full resize-none rounded-lg border border-[#D6D9E4] bg-white px-3 py-3 text-base leading-6 text-black outline-none disabled:text-[#646D89]`} required value={displayedTranslation.reply} onChange={(event) => updateEditingTranslation(suggestionLocale, { reply: event.target.value })} /></label>

                    {displayedTopic.format === "Room type" && <div className="relative grid gap-1"><span className="text-base leading-6 text-[#2A2E3F]">Room type</span><div className="flex min-h-14 flex-wrap items-center gap-2 rounded-sm border border-[#D6D9E4] bg-white px-3 py-2">{displayedTopic.rooms?.map((room) => <button className="flex h-8 items-center gap-2 rounded-full border-0 bg-[#F1F2F6] px-4 text-base text-[#424C6B] enabled:cursor-pointer" key={room} type="button" onClick={() => toggleEditingRoom(room)}>{room}<span aria-hidden="true">×</span></button>)}<button className="h-8 cursor-pointer rounded-full border border-dashed border-[#729280] bg-white px-4 text-sm text-[#526b5d] hover:bg-[#f4f8f5]" type="button" onClick={() => setIsEditingRoomDropdownOpen((current) => !current)}>+ Add room type</button></div>{isEditingRoomDropdownOpen && <div className="absolute top-full z-30 mt-1 flex max-h-[293px] w-full flex-col overflow-hidden border border-[#2684FF] bg-white shadow-[4px_4px_16px_rgba(0,0,0,0.08)]"><input className="h-[45px] shrink-0 border-0 border-b border-[#D6D9E4] px-4 text-sm text-[#2A2E3F] outline-none placeholder:text-[#9AA1B9]" autoFocus placeholder="Search room type..." value={editingRoomSearch} onChange={(event) => setEditingRoomSearch(event.target.value)} /><div className="grid gap-2 overflow-y-auto p-2"><button className="flex h-10 w-full cursor-pointer items-center justify-between border-0 bg-white px-4 text-left text-base text-[#646D89] hover:bg-[#F6F7FC]" type="button" onClick={() => setEditingTopic((current) => current ? { ...current, rooms: current.rooms?.length === selectableRoomTypes.length ? [] : [...selectableRoomTypes] } : current)}><span>All</span>{displayedTopic.rooms?.length === selectableRoomTypes.length && <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="#9AA1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>{selectableRoomTypes.filter((room) => room.toLowerCase().includes(editingRoomSearch.trim().toLowerCase())).map((room) => <button className="flex h-10 w-full cursor-pointer items-center justify-between border-0 bg-white px-4 text-left text-base text-[#646D89] hover:bg-[#F6F7FC]" key={room} type="button" onClick={() => toggleEditingRoom(room)}><span>{room}</span>{displayedTopic.rooms?.includes(room) && <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="#9AA1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>)}</div></div>}</div>}

                    {displayedTopic.format === "Option with details" && displayedTranslation.options.map((option, index) => <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1 max-md:gap-4" key={`${topic.id}-${index}`}><label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Option<input className="h-12 rounded-sm border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" required value={option.name} onChange={(event) => updateEditingTranslation(suggestionLocale, { options: displayedTranslation.options.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} /></label><label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Details<textarea className="h-[76px] resize-none rounded-lg border border-[#D6D9E4] bg-white px-3 py-3 text-base leading-6 text-black outline-none disabled:text-[#646D89]" required value={option.details} onChange={(event) => updateEditingTranslation(suggestionLocale, { options: displayedTranslation.options.map((item, itemIndex) => itemIndex === index ? { ...item, details: event.target.value } : item) })} /></label></div>)}

                    {displayedTopic.format === "Room type" && <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Button name<input className="h-12 rounded-sm border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" required value={displayedTranslation.buttonName ?? ""} onChange={(event) => updateEditingTranslation(suggestionLocale, { buttonName: event.target.value })} /></label>}

                    {isEditing && <div className="flex h-12 items-center gap-6"><button className="flex h-12 w-[100px] cursor-pointer items-center justify-center rounded-sm border-0 bg-[#C14817] px-8 text-base leading-4 font-semibold text-white" type="submit">Save</button><button className="h-6 cursor-pointer border-0 bg-transparent px-2 text-base leading-4 font-semibold text-[#646D89]" type="button" onClick={() => { setEditingTopic(null); setIsEditingRoomDropdownOpen(false); }}>Cancel</button></div>}
                  </fieldset>

                  <div className="flex shrink-0 flex-col items-center gap-4"><span className={`grid h-[26px] w-[26px] place-items-center ${editingTopic ? "cursor-not-allowed" : "cursor-grab"}`} title="Drag to reorder"><DragIcon /></span><button className="grid h-[26px] w-[26px] cursor-pointer place-items-center border-0 bg-transparent disabled:cursor-not-allowed" type="button" title="Edit topic" disabled={Boolean(editingTopic || isAddingTopic)} onClick={() => startEditingTopic(topic)}><EditIcon /></button><button className="grid h-[26px] w-[26px] cursor-pointer place-items-center border-0 bg-transparent disabled:cursor-not-allowed" type="button" title="Delete topic" disabled={Boolean(editingTopic)} onClick={() => setDeletingTopic(topic)}><DeleteIcon /></button></div>
                </form>
                );
              })}
            </div>

            {isAddingTopic ? (
              <form className="flex min-h-[196px] w-full flex-col items-start gap-6 rounded-lg bg-[#F6F7FC] p-6" noValidate onSubmit={savePresetTopic}>
                <div className="flex rounded-md border border-[#D6D9E4] bg-white p-0.5 text-sm font-semibold text-[#646D89]" aria-label="New suggestion language">
                  <button type="button" onClick={() => changeNewSuggestionLocale("th")} className={`rounded px-3 py-1.5 ${newSuggestionLocale === "th" ? "bg-[#E8F0EB] text-[#365A46] shadow-sm" : "hover:text-[#365A46]"}`}>ไทย</button>
                  <button type="button" onClick={() => changeNewSuggestionLocale("en")} className={`rounded px-3 py-1.5 ${newSuggestionLocale === "en" ? "bg-[#E8F0EB] text-[#365A46] shadow-sm" : "hover:text-[#365A46]"}`}>English</button>
                </div>
                <div className="grid w-full grid-cols-2 items-start gap-10 max-md:grid-cols-1 max-md:gap-6">
                  <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Topic *<input className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !newTopic.trim() ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !newTopic.trim()} autoFocus value={newTopic} onChange={(event) => setNewTopic(event.target.value)} />{showNewTopicErrors && !newTopic.trim() && <FieldError />}</label>
                  <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Reply format<select className={`h-12 w-full rounded-sm border bg-white px-3 text-base text-[#646D89] outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !newReplyFormat ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !newReplyFormat} value={newReplyFormat} onChange={(event) => { setNewReplyFormat(event.target.value as PresetTopic["format"] | ""); setNewReplyMessage(""); setNewReplyTitle(""); setNewOptions([{ name: "", details: "" }]); setNewRoomTitle(""); setSelectedRooms([]); setNewButtonName(""); setRoomSearch(""); setIsRoomDropdownOpen(false); }}><option value="" disabled>Select reply format</option><option value="Room type">Room type</option><option value="Message">Message</option><option value="Option with details">Option with details</option></select>{showNewTopicErrors && !newReplyFormat && <FieldError>Please select reply format</FieldError>}</label>
                </div>
                {newReplyFormat === "Message" && <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Reply message<input className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !newReplyMessage.trim() ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !newReplyMessage.trim()} value={newReplyMessage} onChange={(event) => setNewReplyMessage(event.target.value)} />{showNewTopicErrors && !newReplyMessage.trim() && <FieldError />}</label>}
                {newReplyFormat === "Room type" && <div className="grid w-full gap-6">
                  <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Reply title<input className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !newRoomTitle.trim() ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !newRoomTitle.trim()} value={newRoomTitle} onChange={(event) => setNewRoomTitle(event.target.value)} />{showNewTopicErrors && !newRoomTitle.trim() && <FieldError />}</label>
                  <div className="relative grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">
                    <span>Room type</span>
                    <div className={`flex min-h-12 w-full cursor-pointer flex-wrap items-center gap-2 rounded-sm border bg-white px-3 py-2 ${showNewTopicErrors && selectedRooms.length === 0 ? "faq-invalid-field" : "border-[#D6D9E4]"}`} role="button" tabIndex={0} aria-expanded={isRoomDropdownOpen} onClick={() => setIsRoomDropdownOpen((current) => !current)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setIsRoomDropdownOpen((current) => !current); } }}>
                      {selectedRooms.map((room) => <button className="flex h-8 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#F1F2F6] px-4 text-sm text-[#424C6B]" key={room} type="button" onClick={(event) => { event.stopPropagation(); toggleRoom(room); }}>{room}<span className="text-xl leading-none" aria-hidden="true">×</span><span className="sr-only">Remove {room}</span></button>)}
                      {selectedRooms.length === 0 && <span className="text-sm text-[#2A2E3F]">Select room type</span>}
                    </div>
                    {showNewTopicErrors && selectedRooms.length === 0 && <FieldError>Please select room type</FieldError>}
                    {isRoomDropdownOpen && <div className="absolute top-full z-30 mt-1 flex max-h-[293px] w-full flex-col overflow-hidden border border-[#2684FF] bg-white shadow-[4px_4px_16px_rgba(0,0,0,0.08)]">
                      <input className="h-[45px] shrink-0 border-0 border-b border-[#D6D9E4] px-4 text-sm text-[#2A2E3F] outline-none placeholder:text-[#9AA1B9]" autoFocus placeholder="Search room type..." value={roomSearch} onClick={(event) => event.stopPropagation()} onChange={(event) => setRoomSearch(event.target.value)} />
                      <div className="grid gap-2 overflow-y-auto p-2">
                        <button className="flex h-10 w-full cursor-pointer items-center justify-between border-0 bg-white px-4 text-left text-base text-[#646D89] hover:bg-[#F6F7FC]" type="button" onClick={() => setSelectedRooms(selectedRooms.length === selectableRoomTypes.length ? [] : [...selectableRoomTypes])}><span>All</span>{selectedRooms.length === selectableRoomTypes.length && <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="#9AA1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
                        {selectableRoomTypes.filter((room) => room.toLowerCase().includes(roomSearch.trim().toLowerCase())).map((room) => <button className="flex h-10 w-full cursor-pointer items-center justify-between border-0 bg-white px-4 text-left text-base text-[#646D89] hover:bg-[#F6F7FC]" key={room} type="button" onClick={() => toggleRoom(room)}><span>{room}</span>{selectedRooms.includes(room) && <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="#9AA1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>)}
                      </div>
                    </div>}
                  </div>
                  <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Button name<input className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !newButtonName.trim() ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !newButtonName.trim()} value={newButtonName} onChange={(event) => setNewButtonName(event.target.value)} />{showNewTopicErrors && !newButtonName.trim() && <FieldError />}</label>
                </div>}
                {newReplyFormat === "Option with details" && <div className="grid w-full gap-6">
                  <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Reply title<input className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !newReplyTitle.trim() ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !newReplyTitle.trim()} value={newReplyTitle} onChange={(event) => setNewReplyTitle(event.target.value)} />{showNewTopicErrors && !newReplyTitle.trim() && <FieldError />}</label>
                  {newOptions.map((option, index) => <div className="grid grid-cols-2 items-start gap-10 max-md:grid-cols-1 max-md:gap-4" key={index}><label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Option<input className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !option.name.trim() ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !option.name.trim()} value={option.name} onChange={(event) => setNewOptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />{showNewTopicErrors && !option.name.trim() && <FieldError />}</label><label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Details<input className={`h-12 w-full rounded-lg border bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-[#729280]/10 ${showNewTopicErrors && !option.details.trim() ? "faq-invalid-field" : "border-[#D6D9E4] focus:border-[#729280]"}`} aria-invalid={showNewTopicErrors && !option.details.trim()} value={option.details} onChange={(event) => setNewOptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, details: event.target.value } : item))} />{showNewTopicErrors && !option.details.trim() && <FieldError />}</label></div>)}
                  <button className="flex h-12 w-[166px] cursor-pointer items-center justify-center rounded-sm border border-[#E76B39] bg-white px-8 text-base leading-4 font-semibold text-[#E76B39] hover:bg-[#FFF7F3]" type="button" onClick={() => setNewOptions((current) => [...current, { name: "", details: "" }])}>+ Add Option</button>
                </div>}
                <div className="flex h-12 items-center gap-6"><button className="flex h-12 w-[100px] cursor-pointer items-center justify-center rounded-sm border-0 bg-[#C14817] px-8 text-base leading-4 font-semibold text-white" type="submit">Save</button><button className="h-6 cursor-pointer border-0 bg-transparent px-2 text-base leading-4 font-semibold text-[#646D89]" type="button" onClick={cancelPresetTopic}>Cancel</button></div>
              </form>
            ) : (
              <button className="order-6 flex h-12 w-[246px] shrink-0 grow-0 cursor-pointer items-center justify-center gap-2.5 rounded-sm border border-[#E76B39] bg-white px-8 py-4 font-['Open_Sans',Arial,sans-serif] text-[#E76B39] hover:bg-[#FFF7F3] focus:outline-2 focus:outline-offset-2 focus:outline-[#E76B39] disabled:cursor-not-allowed disabled:border-[#D6D9E4] disabled:text-[#9AA1B9] disabled:hover:bg-white" type="button" disabled={Boolean(editingTopic)} onClick={addPresetTopic}><span className="h-4 w-[182px] whitespace-nowrap text-center text-base leading-4 font-semibold">+ Add Suggestion menu</span></button>
            )}
        </section>
      </div>
      {deletingTopic && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeletingTopic(null); }}>
        <section className="flex h-[200px] w-full max-w-[631px] flex-col rounded-sm bg-white shadow-[2px_2px_12px_rgba(64,50,133,0.12)]" role="dialog" aria-modal="true" aria-labelledby="delete-suggestion-title" aria-describedby="delete-suggestion-description">
          <header className="flex h-14 shrink-0 items-center border-b border-[#E4E6ED] px-6">
            <h2 className="m-0 flex-1 text-xl leading-[30px] font-semibold tracking-[-0.02em] text-black" id="delete-suggestion-title">Delete Suggestion menu?</h2>
            <button className="grid h-10 w-[41px] cursor-pointer place-items-center border-0 bg-transparent text-2xl leading-none text-[#C8CCDB]" type="button" aria-label="Close delete confirmation" onClick={() => setDeletingTopic(null)}>×</button>
          </header>
          <div className="flex flex-1 flex-col items-end gap-6 p-6">
            <p className="m-0 w-full text-base leading-6 tracking-[-0.02em] text-[#646D89]" id="delete-suggestion-description">Are you sure you want to delete this suggestion menu?</p>
            <div className="flex h-12 items-start gap-4">
              <button className="flex h-12 w-[220px] cursor-pointer items-center justify-center rounded-sm border border-[#E76B39] bg-white px-8 font-['Open_Sans',Arial,sans-serif] text-base leading-4 font-semibold whitespace-nowrap text-[#E76B39] hover:bg-[#FFF7F3]" type="button" onClick={confirmDeleteTopic}>Yes, I want to delete</button>
              <button className="flex h-12 w-36 cursor-pointer items-center justify-center rounded-sm border-0 bg-[#C14817] px-8 font-['Open_Sans',Arial,sans-serif] text-base leading-4 font-semibold whitespace-nowrap text-white hover:bg-[#A93F13]" type="button" onClick={() => setDeletingTopic(null)}>No, I don&apos;t</button>
            </div>
          </div>
        </section>
      </div>}
    </div>
  );
}
