"use client";

import { formatThb } from "@/features/booking/format";
import { ImageCarousel } from "@/features/booking/components/ImageCarousel";
import type { RoomType } from "@/features/booking/types";

type RoomDetailViewProps = {
  room: RoomType;
};

export function RoomDetailView({ room }: RoomDetailViewProps) {
  const midpoint = Math.ceil(room.amenities.length / 2);
  const leftAmenities = room.amenities.slice(0, midpoint);
  const rightAmenities = room.amenities.slice(midpoint);
  const hasDiscount = room.discountedPrice < room.fullPrice;

  return (
    <div className="bg-white">
      <ImageCarousel name={room.name} imageUrls={room.imageUrls} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:px-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="font-serif text-4xl text-brand-ink sm:text-5xl">{room.name}</h1>
            <p className="mt-4 text-sm leading-6 text-brand-muted">{room.description}</p>
            <p className="mt-4 text-sm text-brand-muted">
              {room.guests} Person | {room.bedType} | {room.sizeSqm} sqm
            </p>
          </div>

          <div className="shrink-0 lg:text-right">
            {hasDiscount && (
              <p className="text-sm text-brand-muted line-through">{formatThb(room.fullPrice)}</p>
            )}
            <p className="text-2xl font-semibold text-brand-ink">{formatThb(room.discountedPrice)}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-sm bg-brand-primary px-10 py-3 text-sm font-medium text-white hover:bg-brand-primary-hover lg:w-auto"
            >
              Book Now
            </button>
          </div>
        </div>

        <hr className="my-10 border-brand-border" />

        <section>
          <h2 className="text-base font-semibold text-brand-ink">Room Amenities</h2>
          {room.amenities.length === 0 ? (
            <p className="mt-6 text-sm text-brand-muted">No amenities listed yet.</p>
          ) : (
            <div className="mt-6 grid gap-x-16 gap-y-3 sm:grid-cols-2">
              <ul className="space-y-3 text-sm text-brand-body">
                {leftAmenities.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-muted" />
                    {item}
                  </li>
                ))}
              </ul>
              <ul className="space-y-3 text-sm text-brand-body">
                {rightAmenities.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-muted" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
