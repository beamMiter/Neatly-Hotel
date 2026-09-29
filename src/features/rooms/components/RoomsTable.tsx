"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { RoomTypeSummary } from "@/types/room-type";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COLUMNS = ["Image", "Room type", "Price", "Promotion Price", "Guest(s)", "Bed Type", "Room Size"];

export function RoomsTable({ rooms }: { rooms: RoomTypeSummary[] }) {
  const router = useRouter();

  if (rooms.length === 0) {
    return <p className="px-8 py-12 text-center text-sm text-brand-muted">No rooms found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="bg-brand-surface-alt text-brand-muted">
            {COLUMNS.map((column) => (
              <th key={column} className="whitespace-nowrap px-6 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr
              key={room.id}
              onClick={() => router.push(`/room-property/${room.id}`)}
              className="cursor-pointer border-b border-brand-border transition-colors last:border-0 hover:bg-brand-surface-alt"
            >
              <td className="px-6 py-4">
                <div className="relative h-12 w-16 overflow-hidden rounded-md bg-brand-surface-alt">
                  {room.imageUrl && <Image src={room.imageUrl} alt="" fill className="object-cover" />}
                </div>
              </td>
              <td className="px-6 py-4 text-brand-body">{room.roomType}</td>
              <td className="px-6 py-4 text-brand-body">{formatCurrency(room.price)}</td>
              <td className="px-6 py-4 text-brand-body">
                {room.promotionPrice === null ? "-" : formatCurrency(room.promotionPrice)}
              </td>
              <td className="px-6 py-4 text-brand-body">{room.guests}</td>
              <td className="px-6 py-4 text-brand-body">{room.bedType}</td>
              <td className="px-6 py-4 text-brand-body">{room.roomSizeSqm} sqm</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
