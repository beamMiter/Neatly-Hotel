import Link from "next/link";
import { formatThb } from "@/features/booking/format";
import { RoomImagePlaceholder } from "@/features/booking/components/RoomImagePlaceholder";
import { BookNowButton } from "@/components/shared/BookNowButton";
import { buildBookingHref } from "@/features/booking-flow/utils";
import type { RoomSearchResult, SearchQuery } from "@/types/room-search";

type RoomCardProps = {
  room: RoomSearchResult;
  searchQuery: SearchQuery;
  isLoggedIn: boolean;
};

export function RoomCard({ room, searchQuery, isLoggedIn }: RoomCardProps) {
  const hasDiscount = room.discountedPrice < room.fullPrice;
  const cover = room.imageUrls[0];
  const bookingHref = buildBookingHref(room.id, searchQuery);

  return (
    <article className="grid gap-6 border-b border-brand-border py-8 lg:grid-cols-[minmax(280px,2fr)_minmax(0,3fr)] lg:gap-10">
      <RoomImagePlaceholder
        label={room.name}
        index={0}
        src={cover}
        showGalleryHint
        className="aspect-[16/10] w-full lg:min-h-[220px]"
      />

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl text-brand-ink">{room.name}</h2>
            <p className="mt-2 text-sm text-brand-muted">
              {room.guests} Guests | {room.bedType} | {room.sizeSqm} sqm
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-brand-muted">{room.description}</p>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            {hasDiscount && (
              <p className="text-sm text-brand-muted line-through">{formatThb(room.fullPrice)}</p>
            )}
            <p className="text-xl font-semibold text-brand-ink">{formatThb(room.discountedPrice)}</p>
            <p className="mt-1 text-xs text-brand-muted">Per Night (Including Taxes & Fees)</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-end gap-6 pt-6">
          <Link
            href={`/rooms/${room.id}`}
            className="text-sm font-medium text-brand-primary transition-[color,transform] duration-150 hover:text-brand-primary-hover active:scale-95"
          >
            Room Detail
          </Link>
          <BookNowButton
            href={bookingHref}
            isLoggedIn={isLoggedIn}
            className="cursor-pointer rounded-sm bg-brand-primary px-6 py-3 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-brand-primary-hover active:scale-95"
          >
            Book Now
          </BookNowButton>
        </div>
      </div>
    </article>
  );
}
