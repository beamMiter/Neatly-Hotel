import {
  getBuildingFromRoomNo,
  getFloorFromRoomNo,
  HOTEL_LAYOUT,
  HOTEL_ROOMS,
  type LayoutRoom,
} from "@/data/hotel-layout";
import type { BedType, Room, RoomStatus } from "@/types/rooms";

const LAYOUT_BY_ROOM_NO = new Map(
  HOTEL_ROOMS.map((room) => [room.roomNo, room]),
);

/** Realistic housekeeping mix for demo / initial seed */
const SEED_STATUSES: RoomStatus[] = [
  "Vacant Clean",
  "Occupied",
  "Assign Clean",
  "Vacant Clean Inspected",
  "Occupied Dirty",
  "Vacant",
  "Occupied Clean",
  "Assign Dirty",
  "Vacant Clean Pick Up",
  "Out of Service",
];

function layoutToRoom(layout: LayoutRoom, index: number): Room {
  return {
    id: `layout-${layout.roomNo}`,
    roomNo: layout.roomNo,
    roomType: layout.roomType,
    bedType: layout.bedType as BedType,
    status: SEED_STATUSES[index % SEED_STATUSES.length],
    building: layout.building,
    floor: layout.floor,
  };
}

/** 70 physical rooms from hotel layout — used for Supabase seed */
export function buildLayoutRooms(): Room[] {
  return HOTEL_ROOMS.map(layoutToRoom);
}

export function enrichRoomFromLayout(room: Room): Room {
  const layout = LAYOUT_BY_ROOM_NO.get(room.roomNo);
  if (layout) {
    return {
      ...room,
      building: layout.building,
      floor: layout.floor,
    };
  }

  const building = getBuildingFromRoomNo(room.roomNo);
  const floor = getFloorFromRoomNo(room.roomNo);
  if (!building) return room;

  return {
    ...room,
    building,
    floor,
  };
}

export function compareRoomNo(a: string, b: string): number {
  const aIsVilla = /^V/i.test(a);
  const bIsVilla = /^V/i.test(b);
  if (aIsVilla !== bIsVilla) return aIsVilla ? 1 : -1;

  const aFloor = getFloorFromRoomNo(a) ?? 0;
  const bFloor = getFloorFromRoomNo(b) ?? 0;
  if (aFloor !== bFloor) return aFloor - bFloor;

  return a.localeCompare(b, undefined, { numeric: true });
}

export function sortRoomsByLayout(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => compareRoomNo(a.roomNo, b.roomNo));
}

export function formatRoomLocation(room: Room): string | null {
  if (!room.building) return null;
  if (room.building === "Pool Villa Wing") return `${room.building}`;
  if (room.floor != null) return `${room.building} · Fl.${room.floor}`;
  return room.building;
}

export { HOTEL_LAYOUT };

export type LayoutRoomSeed = {
  roomNo: string;
  roomType: string;
  bedType: string;
  status: RoomStatus;
};

export function buildLayoutRoomSeeds(): LayoutRoomSeed[] {
  return buildLayoutRooms().map(({ roomNo, roomType, bedType, status }) => ({
    roomNo,
    roomType,
    bedType,
    status,
  }));
}
