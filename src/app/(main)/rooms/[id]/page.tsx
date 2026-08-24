import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RoomDetail from "@/components/shared/RoomDetail";
import { toLandingRoom } from "@/features/booking/format";
import { getGuestRoomTypeById, searchRoomTypes } from "@/server/queries/booking-search.query";
import { ROOMS, getRoomBySlug } from "@/data/rooms";
import { shuffle } from "@/lib/shuffle";

type RoomDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function bangkokIsoDate(offsetDays = 0): string {
  const now = new Date();
  const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  bangkokNow.setDate(bangkokNow.getDate() + offsetDays);
  const year = bangkokNow.getFullYear();
  const month = String(bangkokNow.getMonth() + 1).padStart(2, "0");
  const day = String(bangkokNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCount(value: string, fallback: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function generateMetadata({ params }: RoomDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  if (isUuid(id)) {
    const room = await getGuestRoomTypeById(id);
    return {
      title: room ? `${room.name} | Neatly Hotel` : "Room | Neatly Hotel",
      description: room?.description ?? "Room details at Neatly Hotel",
    };
  }

  const room = getRoomBySlug(id);
  return {
    title: room ? `${room.name} | Neatly Hotel` : "Room | Neatly Hotel",
    description: room?.description ?? "Room details at Neatly Hotel",
  };
}

export default async function RoomDetailPage({ params, searchParams }: RoomDetailPageProps) {
  const { id } = await params;
  const search = await searchParams;

  const checkIn = first(search.checkIn) || bangkokIsoDate(0);
  const checkOut = first(search.checkOut) || bangkokIsoDate(1);
  const guests = parseCount(first(search.guests), 2, 8);
  const rooms = parseCount(first(search.rooms), 1, 3);

  if (isUuid(id)) {
    const room = await getGuestRoomTypeById(id);
    if (!room) notFound();

    const others = await searchRoomTypes({ checkIn: "", checkOut: "", rooms: 1, guests: 1 });
    const otherRooms = shuffle(
      others.filter((item) => item.id !== id).map(toLandingRoom),
    );

    return (
      <main className="flex-1">
        <RoomDetail
          room={toLandingRoom(room)}
          otherRooms={otherRooms}
          bookingQuery={{ checkIn, checkOut, guests, rooms }}
        />
      </main>
    );
  }

  const room = getRoomBySlug(id);
  if (!room) notFound();

  const otherRooms = shuffle(ROOMS.filter((item) => item.slug !== id));

  return (
    <main className="flex-1">
      <RoomDetail room={room} otherRooms={otherRooms} />
    </main>
  );
}
