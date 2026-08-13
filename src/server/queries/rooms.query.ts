import { prisma } from "@/server/db";
import type { BedType, Room, RoomStatus } from "@/types/rooms";

function mapRoom(row: {
  id: string;
  roomNo: string;
  roomType: string;
  bedType: string;
  status: string;
}): Room {
  return {
    id: row.id,
    roomNo: row.roomNo,
    roomType: row.roomType,
    bedType: row.bedType as BedType,
    status: row.status as RoomStatus,
  };
}

export async function getRooms(): Promise<Room[]> {
  const rows = await prisma.room.findMany({
    orderBy: { roomNo: "asc" },
  });

  return rows.map(mapRoom);
}

export async function updateRoomStatus(
  id: string,
  status: RoomStatus,
): Promise<Room | null> {
  const row = await prisma.room.update({
    where: { id },
    data: { status },
  });

  return mapRoom(row);
}
