"use client";

import Image from "next/image";
import Link from "next/link";
import { SupportBookingCard, isBookingConfirmationMessage } from "@/features/chatbot/components/support-booking-card";
import type { ChatMessage, WidgetLocale } from "@/features/chatbot/components/chat-widget.types";
import type { ChatbotRoomResult } from "@/types/chatbot";
import type { SpecialRequestOption } from "@/types/booking";
import type { SupportBooking } from "@/types/live-support";

type Props = {
  messages: ChatMessage[];
  supportBooking: SupportBooking | null;
  specialRequestOptions: SpecialRequestOption[];
  visitorToken: string | null;
  locale: WidgetLocale;
  isSupportResolved: boolean;
  hasBookingConfirmationMessage: boolean;
  isBooking: boolean;
  bookNowLabel: string;
  viewDetailsLabel: string;
  onStartBooking: (room: ChatbotRoomResult) => void;
  onOpenMainBooking: (roomName: string) => void;
  onSelectSuggestedRoom: (roomName: string) => void;
  onCreateLiveSupport: (content: string) => void;
  onPayment: () => void;
};

export function ChatMessageList(props: Props) {
  const startsBooking = (message: ChatMessage) => [message.suggestion?.button_name, message.suggestion?.translations?.en?.button_name]
    .some((buttonName) => buttonName?.trim().toLowerCase() === "book now");
  const isSpecialBookingOption = (optionName: string) => ["seminar", "group", "bulk"].some((term) => optionName.trim().toLowerCase().includes(term));
  const specialBookingRequest = (optionName: string) => props.locale === "th" ? "สนใจ" + optionName : "I am interested in " + optionName;

  return (
    <>
      {props.messages.map((message) => isBookingConfirmationMessage(message, props.supportBooking) && props.supportBooking && !props.isSupportResolved ? (
        <SupportBookingCard key={message.id} booking={props.supportBooking} specialRequestOptions={props.specialRequestOptions} visitorToken={props.visitorToken} locale={props.locale} onConfirmed={props.onPayment} />
      ) : (
        <div key={message.id} className="w-full">
          <div className={"flex w-full " + (message.role === "user" ? "justify-end" : "justify-start")}>
            <p className={"m-0 max-w-[255px] whitespace-pre-line rounded-lg px-4 py-2 text-base leading-6 tracking-[-.02em] " + (message.role === "user" ? "bg-[#C14817] text-white" : "bg-white text-[#646D89]")}>{message.content}</p>
          </div>
          {!!message.rooms?.length && <RoomCards message={message} locale={props.locale} isBooking={props.isBooking} bookNowLabel={props.bookNowLabel} viewDetailsLabel={props.viewDetailsLabel} onStartBooking={props.onStartBooking} />}
          {message.suggestion?.format === "Option with details" && message.suggestion.options.length > 0 && (
            <div className="mt-3 grid max-w-[300px] gap-2">
              {message.suggestion.options.map((option) => isSpecialBookingOption(option.name) ? <button className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#DDE3E0] bg-white px-4 py-2 text-left font-semibold text-[#465C50] hover:border-[#ABC0B4] hover:bg-[#F4F8F5]" key={option.name} type="button" onClick={() => props.onCreateLiveSupport(specialBookingRequest(option.name))}><span aria-hidden="true">▶</span>{option.name}</button> : <details className="rounded-lg border border-[#DDE3E0] bg-white px-4 py-2 text-[#646D89]" key={option.name}><summary className="cursor-pointer font-semibold text-[#465C50]">{option.name}</summary><p className="mt-2 text-sm leading-5">{option.details}</p></details>)}
            </div>
          )}
          {message.suggestion?.format === "Room type" && !message.rooms?.length && message.suggestion.rooms.length > 0 && (
            <div className="mt-3 flex max-w-[320px] flex-wrap gap-2">
              {message.suggestion.rooms.map((room) => <button className="rounded-full border border-[#ABC0B4] bg-white px-3 py-2 text-sm text-[#465C50]" key={room} type="button" onClick={() => startsBooking(message) ? props.onOpenMainBooking(room) : props.onSelectSuggestedRoom(room)}>{room}{message.suggestion?.button_name ? " · " + message.suggestion.button_name : ""}</button>)}
            </div>
          )}
        </div>
      ))}
      {props.supportBooking && !props.isSupportResolved && !props.hasBookingConfirmationMessage && <SupportBookingCard booking={props.supportBooking} specialRequestOptions={props.specialRequestOptions} visitorToken={props.visitorToken} locale={props.locale} onConfirmed={props.onPayment} />}
    </>
  );
}

function RoomCards({ message, locale, isBooking, bookNowLabel, viewDetailsLabel, onStartBooking }: {
  message: ChatMessage;
  locale: WidgetLocale;
  isBooking: boolean;
  bookNowLabel: string;
  viewDetailsLabel: string;
  onStartBooking: (room: ChatbotRoomResult) => void;
}) {
  const bookingMode = [message.suggestion?.button_name, message.suggestion?.translations?.en?.button_name].some((buttonName) => buttonName?.trim().toLowerCase() === "book now");
  return <div className="relative z-[1] -mr-4 mt-4 flex snap-x gap-2 overflow-x-auto pr-4 pb-2">
    {message.rooms?.map((room, index) => <article className="h-[317px] w-[255px] min-w-[255px] snap-start overflow-hidden rounded-lg bg-white shadow-[0_5px_18px_rgba(52,61,78,.08)]" key={room.id}>
      <div className={"relative h-[155px] overflow-hidden bg-cover bg-center " + (index % 3 === 0 ? "bg-[linear-gradient(155deg,transparent_0_30%,rgba(52,74,65,.25)_31%),linear-gradient(18deg,#ccb28e_0_28%,#e7edf2_29%_62%,#98b6c9_63%)]" : index % 3 === 1 ? "bg-[linear-gradient(90deg,rgba(81,68,57,.72)_0_24%,transparent_25%),linear-gradient(160deg,#d9d3ca_0_45%,#f2eee8_46%_70%,#a5b6bd_71%)]" : "bg-[linear-gradient(25deg,#8eaa94_0_26%,transparent_27%),linear-gradient(150deg,#e9d5b8_0_48%,#bfd4e0_49%)]")} role="img" aria-label={(locale === "th" ? "ภาพห้อง " : "Room image ") + room.name}>
        {room.imageUrl && <Image src={room.imageUrl} alt={room.name} fill className="object-cover" sizes="255px" />}
      </div>
      <div className="flex h-[122px] flex-col justify-center gap-1.5 px-4 pt-2.5 pb-4">
        <div><h3 className="m-0 text-base leading-6 font-semibold tracking-[-.02em] text-[#2A2E3F]">{room.name}</h3><p className="m-0 text-base leading-6 font-semibold tracking-[-.02em] text-[#E76B39]">THB {room.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
        <p className="m-0 line-clamp-2 min-h-[42px] text-sm leading-[21px] font-medium tracking-[-.02em] text-[#9AA1B9]">{locale === "th" ? room.description : room.size + " with " + room.bed.toLowerCase() + ", bathroom and space for " + room.capacity + " guests. " + room.description}</p>
      </div>
      <div className="flex h-10 items-center bg-[#FAEDE8] p-2">
        {bookingMode ? <button className="flex w-full cursor-pointer items-center justify-center px-2 py-1 text-base leading-4 font-semibold text-[#E76B39] disabled:cursor-wait disabled:opacity-60" type="button" disabled={isBooking} onClick={() => onStartBooking(room)}>{isBooking ? (locale === "th" ? "กำลังตรวจสอบ..." : "Checking...") : bookNowLabel}</button> : <Link className="flex w-full cursor-pointer items-center justify-between px-2 py-1 text-base leading-4 font-semibold text-[#E76B39]" href={room.detailHref}>{viewDetailsLabel}<span className="text-2xl font-light leading-4" aria-hidden="true">›</span></Link>}
      </div>
    </article>)}
  </div>;
}
