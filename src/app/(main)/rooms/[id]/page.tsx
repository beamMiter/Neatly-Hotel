import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RoomDetail from "@/components/shared/RoomDetail";
import { toLandingRoom } from "@/features/booking/format";
import { getGuestRoomTypeById, searchRoomTypes } from "@/features/booking/queries";
import { ROOMS, getRoomBySlug } from "@/data/rooms";
import { shuffle } from "@/utils/shuffle";

type RoomDetailPageProps = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
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

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { id } = await params;

  if (isUuid(id)) {
    const room = await getGuestRoomTypeById(id);
    if (!room) notFound();

    const others = await searchRoomTypes({ checkIn: "", checkOut: "", rooms: 1, guests: 1 });
    const otherRooms = shuffle(
      others.filter((item) => item.id !== id).map(toLandingRoom),
    );

    return (
      <main className="flex-1">
        <RoomDetail room={toLandingRoom(room)} otherRooms={otherRooms} />
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
