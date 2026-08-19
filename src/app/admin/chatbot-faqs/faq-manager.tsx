"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/server/db/supabase-browser";
import type { ChatbotSettings } from "@/app/lib/chatbot-faq";

type PresetTopic = {
  id: string;
  topic: string;
  format: "Room type" | "Message" | "Option with details";
  reply: string;
  buttonName?: string;
  rooms?: string[];
  options?: Array<{ name: string; details: string }>;
};

const defaultTopics: PresetTopic[] = [
  { id: "room-types", topic: "Room Types", format: "Room type", reply: "Neatly Hotel offers a variety of room types to suit your needs! 🏨✨ Here are the options", rooms: ["Superior Garden View", "Deluxe", "Superior", "Supreme"], buttonName: "View Details" },
  { id: "booking", topic: "Booking", format: "Room type", reply: "Let's get your booking started First, please choose the type of room you'd like 🛏️✨", rooms: ["Superior Garden View", "Deluxe", "Superior", "Supreme"], buttonName: "Book Now" },
  { id: "check-times", topic: "Check-in & Check-out Time", format: "Message", reply: "Great! 😊 Here are our check-in and check-out times:\nCheck-in time: From 2:00 PM onwards 🕑\nCheck-out time: By 12:00 PM 🕛" },
  { id: "payment", topic: "Payment methods", format: "Option with details", reply: "Here are the payment methods we accept. Tap to see more details 💳💵", options: [{ name: "Credit Card", details: "We accept credit cards including Visa and MasterCard." }, { name: "Cash", details: "You can pay at the hotel with cash or cheque. No payment is required until check-in." }] },
  { id: "promotion", topic: "Promotion", format: "Room type", reply: "🎉 Our promotion this month. Get 10% off 🌞 when you book your stay within this month. Don't miss out!", rooms: ["Superior Garden View", "Deluxe", "Superior", "Supreme"], buttonName: "Book Now" },
];

const availableRoomTypes = ["Superior Garden View", "Deluxe", "Superior", "Supreme"];

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

export default function FaqManager({ initialSettings, adminEmail }: { initialSettings: ChatbotSettings; adminEmail: string }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [presetTopics, setPresetTopics] = useState(defaultTopics);
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
    setRoomSearch("");
    setIsRoomDropdownOpen(false);
    setShowNewTopicErrors(false);
    setIsAddingTopic(true);
  }

  function savePresetTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowNewTopicErrors(true);
    const cleanedOptions = newOptions.map((option) => ({ name: option.name.trim(), details: option.details.trim() }));
    const hasInvalidOption = cleanedOptions.some((option) => !option.name || !option.details);
    if (!newTopic.trim() || !newReplyFormat || (newReplyFormat === "Message" && !newReplyMessage.trim()) || (newReplyFormat === "Option with details" && (!newReplyTitle.trim() || hasInvalidOption)) || (newReplyFormat === "Room type" && (!newRoomTitle.trim() || selectedRooms.length === 0 || !newButtonName.trim()))) return;
    setPresetTopics((current) => [...current, { id: `new-topic-${Date.now()}`, topic: newTopic.trim(), format: newReplyFormat, reply: newReplyFormat === "Option with details" ? newReplyTitle.trim() : newReplyFormat === "Room type" ? newRoomTitle.trim() : newReplyMessage.trim(), options: newReplyFormat === "Option with details" ? cleanedOptions : undefined, rooms: newReplyFormat === "Room type" ? selectedRooms : undefined, buttonName: newReplyFormat === "Room type" ? newButtonName.trim() : undefined }]);
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
      options: topic.options?.map((option) => ({ ...option })),
    });
  }

  function saveEditingTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTopic?.topic.trim() || !editingTopic.reply.trim()) return;
    if (editingTopic.format === "Room type" && (!editingTopic.rooms?.length || !editingTopic.buttonName?.trim())) return;
    if (editingTopic.format === "Option with details" && !editingTopic.options?.every((option) => option.name.trim() && option.details.trim())) return;
    setPresetTopics((current) => current.map((topic) => topic.id === editingTopic.id ? {
      ...editingTopic,
      topic: editingTopic.topic.trim(),
      reply: editingTopic.reply.trim(),
      buttonName: editingTopic.buttonName?.trim(),
    } : topic));
    setEditingTopic(null);
  }

  function changeEditingFormat(format: PresetTopic["format"]) {
    setEditingTopic((current) => current ? {
      ...current,
      format,
      rooms: format === "Room type" ? (current.rooms?.length ? current.rooms : [...availableRoomTypes]) : undefined,
      buttonName: format === "Room type" ? (current.buttonName ?? "") : undefined,
      options: format === "Option with details" ? (current.options?.length ? current.options : [{ name: "", details: "" }]) : undefined,
    } : current);
  }

  function confirmDeleteTopic() {
    if (!deletingTopic) return;
    setPresetTopics((current) => current.filter((topic) => topic.id !== deletingTopic.id));
    setDeletingTopic(null);
  }

  function moveTopic(targetTopicId: string) {
    if (!draggedTopicId || draggedTopicId === targetTopicId) return;
    setPresetTopics((current) => {
      const sourceIndex = current.findIndex((topic) => topic.id === draggedTopicId);
      const targetIndex = current.findIndex((topic) => topic.id === targetTopicId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      const [movedTopic] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, movedTopic);
      return reordered;
    });
    setDraggedTopicId(null);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    await createClient().from("chatbot_settings").update({ greeting_message: settings.greeting_message.trim(), auto_reply_message: settings.auto_reply_message.trim() }).eq("id", true);
    setIsSaving(false);
  }

  function signOut() {
    router.replace("/admin/login");
  }

  return (
    <main className="h-screen overflow-hidden bg-[#F6F7FC] text-[#2e3442]">
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
        <button className="mt-auto flex min-h-[64px] cursor-pointer items-center gap-3 border-t border-white/10 px-7 text-left text-[11px] text-[#e3eae6] max-lg:justify-center max-lg:px-2" type="button" onClick={signOut}><span className="text-[#92aea0]">↪</span><span className="max-lg:hidden">Log Out</span></button>
      </aside>

      <section className="ml-[240px] h-screen pt-[80px] max-lg:ml-[76px] max-sm:ml-0">
        <header className="fixed top-0 right-0 left-[240px] z-20 flex h-[80px] items-center gap-4 border-b border-[#E4E6ED] bg-white px-[60px] max-lg:left-[76px] max-lg:px-6 max-sm:left-0"><h1 className="m-0 text-xl leading-[30px] font-semibold tracking-[-.02em] text-[#2A2E3F]">Chatbot Setup</h1><span className="sr-only">{adminEmail}</span></header>
        <div className="h-[calc(100vh-80px)] overflow-y-auto overscroll-contain bg-[#F6F7FC] px-[60px] pt-10 pb-[60px] max-lg:px-6 max-sm:px-3">
          <section className="flex w-full max-w-[1080px] flex-col items-start gap-10 rounded-sm border border-[#E4E6ED] bg-white px-20 pt-10 pb-[60px] max-xl:px-10 max-md:px-5">
            <form className="grid w-full gap-10" onSubmit={saveSettings}>
              <h2 className="m-0 text-xl leading-[30px] font-semibold tracking-[-.02em] text-[#9AA1B9]">Default Chatbot Messages</h2>
              <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Greeting message *<textarea className="h-24 w-full resize-none rounded-sm border border-[#D6D9E4] bg-white px-3 pt-3 pr-4 text-base leading-6 text-black outline-none focus:border-[#729280] focus:ring-2 focus:ring-[#729280]/10" required value={settings.greeting_message} onChange={(event) => setSettings({ ...settings, greeting_message: event.target.value })} /></label>
              <label className="grid w-full gap-1 text-base leading-6 text-[#2A2E3F]">Auto-reply message *<textarea className="h-24 w-full resize-none rounded-sm border border-[#D6D9E4] bg-white px-3 pt-3 pr-4 text-base leading-6 text-black outline-none focus:border-[#729280] focus:ring-2 focus:ring-[#729280]/10" required value={settings.auto_reply_message} onChange={(event) => setSettings({ ...settings, auto_reply_message: event.target.value })} /></label>
              <button className="h-12 w-fit cursor-pointer rounded-sm bg-[#C14817] px-8 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-50" type="submit" disabled={isSaving}>Save Messages</button>
            </form>

            <div className="h-px w-full bg-[#E4E6ED]" />

            <div className="flex w-full items-center justify-between gap-4"><h2 className="m-0 text-xl leading-[30px] font-semibold tracking-[-.02em] text-[#9AA1B9]">Suggestion menu &amp; Response</h2></div>

            <div className="grid w-full gap-6">
              {presetTopics.map((topic) => {
                const isEditing = editingTopic?.id === topic.id;
                const displayedTopic = isEditing ? editingTopic : topic;
                const isAnotherTopicEditing = Boolean(editingTopic && !isEditing);
                return (
                <form className={`flex w-full items-start gap-6 rounded-lg bg-[#F6F7FC] p-6 transition-opacity ${draggedTopicId === topic.id || isAnotherTopicEditing ? "opacity-50" : "opacity-100"}`} key={topic.id} onSubmit={saveEditingTopic} draggable={!editingTopic} onDragStart={() => { if (!editingTopic) setDraggedTopicId(topic.id); }} onDragOver={(event) => { if (!editingTopic) event.preventDefault(); }} onDrop={() => moveTopic(topic.id)} onDragEnd={() => setDraggedTopicId(null)}>
                  <fieldset className="grid min-w-0 flex-1 gap-6 border-0 p-0" disabled={!isEditing}>
                    <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1 max-md:gap-6">
                      <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Topic *<input className="h-12 rounded-lg border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" required value={displayedTopic.topic} onChange={(event) => setEditingTopic((current) => current ? { ...current, topic: event.target.value } : current)} /></label>
                      <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Reply format<select className="h-12 rounded-sm border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" value={displayedTopic.format} onChange={(event) => changeEditingFormat(event.target.value as PresetTopic["format"])}><option>Room type</option><option>Message</option><option>Option with details</option></select></label>
                    </div>

                    <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">{displayedTopic.format === "Message" ? "Reply message" : "Reply title"}<textarea className={`${displayedTopic.format === "Message" ? "h-24" : "h-12"} w-full resize-none rounded-lg border border-[#D6D9E4] bg-white px-3 py-3 text-base leading-6 text-black outline-none disabled:text-[#646D89]`} required value={displayedTopic.reply} onChange={(event) => setEditingTopic((current) => current ? { ...current, reply: event.target.value } : current)} /></label>

                    {displayedTopic.format === "Room type" && <div className="grid gap-1"><span className="text-base leading-6 text-[#2A2E3F]">Room type</span><div className="flex min-h-14 flex-wrap items-center gap-2 rounded-sm border border-[#D6D9E4] bg-white px-3 py-2">{displayedTopic.rooms?.map((room) => <button className="flex h-8 items-center gap-2 rounded-full border-0 bg-[#F1F2F6] px-4 text-base text-[#424C6B] enabled:cursor-pointer" key={room} type="button" onClick={() => setEditingTopic((current) => current ? { ...current, rooms: current.rooms?.filter((item) => item !== room) } : current)}>{room}<span aria-hidden="true">×</span></button>)}</div></div>}

                    {displayedTopic.format === "Option with details" && displayedTopic.options?.map((option, index) => <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1 max-md:gap-4" key={`${topic.id}-${index}`}><label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Option<input className="h-12 rounded-sm border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" required value={option.name} onChange={(event) => setEditingTopic((current) => current ? { ...current, options: current.options?.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) } : current)} /></label><label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Details<textarea className="h-[76px] resize-none rounded-lg border border-[#D6D9E4] bg-white px-3 py-3 text-base leading-6 text-black outline-none disabled:text-[#646D89]" required value={option.details} onChange={(event) => setEditingTopic((current) => current ? { ...current, options: current.options?.map((item, itemIndex) => itemIndex === index ? { ...item, details: event.target.value } : item) } : current)} /></label></div>)}

                    {displayedTopic.format === "Room type" && <label className="grid gap-1 text-base leading-6 text-[#2A2E3F]">Button name<input className="h-12 rounded-sm border border-[#D6D9E4] bg-white px-3 text-base text-black outline-none disabled:text-[#646D89]" required value={displayedTopic.buttonName ?? ""} onChange={(event) => setEditingTopic((current) => current ? { ...current, buttonName: event.target.value } : current)} /></label>}

                    {isEditing && <div className="flex h-12 items-center gap-6"><button className="flex h-12 w-[100px] cursor-pointer items-center justify-center rounded-sm border-0 bg-[#C14817] px-8 text-base leading-4 font-semibold text-white" type="submit">Save</button><button className="h-6 cursor-pointer border-0 bg-transparent px-2 text-base leading-4 font-semibold text-[#646D89]" type="button" onClick={() => setEditingTopic(null)}>Cancel</button></div>}
                  </fieldset>

                  <div className="flex shrink-0 flex-col items-center gap-4"><span className={`grid h-[26px] w-[26px] place-items-center ${editingTopic ? "cursor-not-allowed" : "cursor-grab"}`} title="Drag to reorder"><DragIcon /></span><button className="grid h-[26px] w-[26px] cursor-pointer place-items-center border-0 bg-transparent disabled:cursor-not-allowed" type="button" title="Edit topic" disabled={Boolean(editingTopic || isAddingTopic)} onClick={() => startEditingTopic(topic)}><EditIcon /></button><button className="grid h-[26px] w-[26px] cursor-pointer place-items-center border-0 bg-transparent disabled:cursor-not-allowed" type="button" title="Delete topic" disabled={Boolean(editingTopic)} onClick={() => setDeletingTopic(topic)}><DeleteIcon /></button></div>
                </form>
                );
              })}
            </div>

            {isAddingTopic ? (
              <form className="flex min-h-[196px] w-full flex-col items-start gap-6 rounded-lg bg-[#F6F7FC] p-6" noValidate onSubmit={savePresetTopic}>
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
                        <button className="flex h-10 w-full cursor-pointer items-center justify-between border-0 bg-white px-4 text-left text-base text-[#646D89] hover:bg-[#F6F7FC]" type="button" onClick={() => setSelectedRooms(selectedRooms.length === availableRoomTypes.length ? [] : [...availableRoomTypes])}><span>All</span>{selectedRooms.length === availableRoomTypes.length && <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="#9AA1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
                        {availableRoomTypes.filter((room) => room.toLowerCase().includes(roomSearch.trim().toLowerCase())).map((room) => <button className="flex h-10 w-full cursor-pointer items-center justify-between border-0 bg-white px-4 text-left text-base text-[#646D89] hover:bg-[#F6F7FC]" key={room} type="button" onClick={() => toggleRoom(room)}><span>{room}</span>{selectedRooms.includes(room) && <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="#9AA1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>)}
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
      </section>
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
    </main>
  );
}
