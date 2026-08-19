import { prisma } from "@/server/db";
import type { BedType, Room, RoomStatus, RoomTypeOption } from "@/types/rooms";

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

export async function deleteRoom(id: string): Promise<boolean> {
  try {
    await prisma.room.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getRoomTypeOptions(): Promise<RoomTypeOption[]> {
  const types = await prisma.roomType.findMany({
    select: { id: true, name: true, bedType: true },
    orderBy: { name: "asc" },
  });

  if (types.length > 0) {
    return types.map((type) => ({
      id: type.id,
      name: type.name,
      bedType: type.bedType,
    }));
  }

  const rooms = await prisma.room.findMany({
    select: { roomType: true },
    distinct: ["roomType"],
    orderBy: { roomType: "asc" },
  });

  return rooms.map((room) => ({
    id: null,
    name: room.roomType,
    bedType: null,
  }));
}

async function getNextRoomNo(): Promise<string> {
  const latest = await prisma.room.findFirst({
    orderBy: { roomNo: "desc" },
    select: { roomNo: true },
  });

  if (!latest) {
    return "0001";
  }

  const num = Number.parseInt(latest.roomNo, 10);
  if (Number.isNaN(num)) {
    return "0001";
  }

  return String(num + 1).padStart(4, "0");
}

export async function createRoom(input: {
  roomType: string;
  roomTypeId?: string | null;
  bedType: BedType;
  status: RoomStatus;
}): Promise<Room> {
  const roomNo = await getNextRoomNo();

  const row = await prisma.room.create({
    data: {
      roomNo,
      roomType: input.roomType,
      bedType: input.bedType,
      status: input.status,
      roomTypeId: input.roomTypeId ?? null,
    },
  });

  return mapRoom(row);
}
