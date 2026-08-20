import "server-only";
import { nightsBetween } from "@/features/booking/date-rules";
import type { RoomTypeAvailability } from "@/types/room-search";
import { prisma } from "@/server/db";

const UNAVAILABLE_STATUSES = ["Out of Order", "Out of Service", "Out of Inventory"];
const NON_BLOCKING_STATUSES = ["cancelled", "canceled", "completed", "refunded"];

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function getRoomTypeAvailability(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}): Promise<RoomTypeAvailability | null> {
  const roomType = await prisma.roomType.findUnique({
    where: { id: input.roomTypeId },
    select: { id: true, name: true, capacity: true },
  });

  if (!roomType) return null;

  const capacity = roomType.capacity ?? 0;
  const checkIn = toDateOnly(input.checkIn);
  const checkOut = toDateOnly(input.checkOut);

  const overlapping = await prisma.booking.findMany({
    where: {
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      NOT: { status: { in: NON_BLOCKING_STATUSES } },
    },
    select: { rooms: { select: { roomId: true } } },
  });

  const bookedRoomIds = new Set(
    overlapping.flatMap((booking) => booking.rooms.map((item) => item.roomId)),
  );

  const physicalRooms = await prisma.room.findMany({
    where: { roomTypeId: input.roomTypeId },
    select: { id: true, status: true },
  });

  const availableCount = physicalRooms.filter(
    (room) => !UNAVAILABLE_STATUSES.includes(room.status) && !bookedRoomIds.has(room.id),
  ).length;

  const reasons: string[] = [];
  if (input.guests > capacity) {
    reasons.push(`This room fits a maximum of ${capacity} guests`);
  }
  if (availableCount < input.rooms) {
    reasons.push(
      availableCount === 0
        ? "This room type is not available for the selected dates"
        : `Only ${availableCount} room${availableCount === 1 ? "" : "s"} left for these dates`,
    );
  }

  return {
    roomTypeId: roomType.id,
    roomTypeName: roomType.name,
    capacity,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: nightsBetween(input.checkIn, input.checkOut),
    guests: input.guests,
    roomsRequested: input.rooms,
    availableCount,
    canBook: reasons.length === 0,
    reasons,
  };
}
