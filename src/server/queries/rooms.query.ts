import { HOTEL_LAYOUT } from "@/data/hotel-layout";
import {
  buildLayoutRoomSeeds,
  enrichRoomFromLayout,
  sortRoomsByLayout,
} from "@/lib/rooms/layout-rooms";
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

async function syncLayoutRoomsIfNeeded(): Promise<void> {
  const count = await prisma.room.count();
  if (count >= HOTEL_LAYOUT.totalRooms) return;

  const typeRows = await prisma.roomType.findMany({
    select: { id: true, name: true },
  });
  const typeByName = new Map(typeRows.map((type) => [type.name, type.id]));
  const seeds = buildLayoutRoomSeeds();

  for (const room of seeds) {
    await prisma.room.upsert({
      where: { roomNo: room.roomNo },
      create: {
        roomNo: room.roomNo,
        roomType: room.roomType,
        bedType: room.bedType,
        status: room.status,
        roomTypeId: typeByName.get(room.roomType) ?? null,
      },
      update: {
        roomType: room.roomType,
        bedType: room.bedType,
        roomTypeId: typeByName.get(room.roomType) ?? null,
      },
    });
  }
}

export async function getRooms(): Promise<Room[]> {
  await syncLayoutRoomsIfNeeded();

  const rows = await prisma.room.findMany();

  return sortRoomsByLayout(rows.map(mapRoom).map(enrichRoomFromLayout));
}

export async function updateRoomStatus(
  id: string,
  status: RoomStatus,
): Promise<Room | null> {
  const row = await prisma.room.update({
    where: { id },
    data: { status },
  });

  return enrichRoomFromLayout(mapRoom(row));
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

export async function createRoom(input: {
  roomNo: string;
  roomType: string;
  roomTypeId?: string | null;
  bedType: BedType;
  status: RoomStatus;
}): Promise<Room> {
  const row = await prisma.room.create({
    data: {
      roomNo: input.roomNo,
      roomType: input.roomType,
      bedType: input.bedType,
      status: input.status,
      roomTypeId: input.roomTypeId ?? null,
    },
  });

  return enrichRoomFromLayout(mapRoom(row));
}
