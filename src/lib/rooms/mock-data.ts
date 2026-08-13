import type { BedType, Room, RoomStatus } from "@/types/rooms";

export const ROOM_STATUS_STYLES: Record<RoomStatus, { className: string }> = {
  Vacant: {
    className: "bg-[#E8EEF8] text-[#5B7CBA]",
  },
  Occupied: {
    className: "bg-[#DCEAF8] text-[#3B7CC9]",
  },
  "Assign Clean": {
    className: "bg-[#D8F0E4] text-[#2F9B6A]",
  },
  "Assign Dirty": {
    className: "bg-[#F8D9D6] text-[#D1433A]",
  },
  "Vacant Clean": {
    className: "bg-[#D5EFE6] text-[#2A9B78]",
  },
  "Vacant Clean Inspected": {
    className: "bg-[#F5E8C0] text-[#B08A1E]",
  },
  "Vacant Clean Pick Up": {
    className: "bg-[#DDF3D6] text-[#4E9A3A]",
  },
  "Occupied Clean": {
    className: "bg-[#D4E4F7] text-[#3A6FB5]",
  },
  "Occupied Clean Inspected": {
    className: "bg-[#F0E4D2] text-[#A67B4B]",
  },
  "Occupied Dirty": {
    className: "bg-[#F6D5D5] text-[#C83B3B]",
  },
  "Out of Order": {
    className: "bg-[#E6E6EA] text-[#6B6B76]",
  },
  "Out of Service": {
    className: "bg-[#E5E4EA] text-[#7A7688]",
  },
  "Out of Inventory": {
    className: "bg-[#ECECF0] text-[#8A8794]",
  },
};

const BASE_ROOMS: Room[] = [
  {
    id: "1",
    roomNo: "0001",
    roomType: "Superior Garden View",
    bedType: "Queen Bed",
    status: "Occupied",
  },
  {
    id: "2",
    roomNo: "0002",
    roomType: "Deluxe",
    bedType: "King Bed",
    status: "Assign Clean",
  },
  {
    id: "3",
    roomNo: "0003",
    roomType: "Superior",
    bedType: "Twin Beds",
    status: "Vacant Clean",
  },
  {
    id: "4",
    roomNo: "0004",
    roomType: "Premier Sea View",
    bedType: "King Bed",
    status: "Occupied Dirty",
  },
  {
    id: "5",
    roomNo: "0005",
    roomType: "Supreme",
    bedType: "Super King Bed",
    status: "Vacant Clean Inspected",
  },
  {
    id: "6",
    roomNo: "0006",
    roomType: "Suit",
    bedType: "King Bed",
    status: "Vacant Clean Pick Up",
  },
  {
    id: "7",
    roomNo: "0007",
    roomType: "Superior",
    bedType: "Double Bed",
    status: "Occupied Clean",
  },
  {
    id: "8",
    roomNo: "0008",
    roomType: "Superior",
    bedType: "Single Bed",
    status: "Assign Dirty",
  },
  {
    id: "9",
    roomNo: "0009",
    roomType: "Deluxe",
    bedType: "Twin Beds",
    status: "Out of Service",
  },
];

const EXTRA_STATUSES: RoomStatus[] = [
  "Vacant",
  "Occupied",
  "Assign Clean",
  "Vacant Clean",
  "Occupied Dirty",
  "Vacant Clean Inspected",
  "Vacant Clean Pick Up",
  "Occupied Clean",
  "Assign Dirty",
];

const EXTRA_ROOM_TYPES = [
  "Superior Garden View",
  "Deluxe",
  "Superior",
  "Premier Sea View",
  "Supreme",
  "Suit",
];

const EXTRA_BED_TYPES: BedType[] = [
  "Single Bed",
  "Twin Beds",
  "Double Bed",
  "Queen Bed",
  "King Bed",
  "Super King Bed",
  "Sofa Bed",
];

/** 45 rooms = 5 pages × 9 rows (matches design pagination) */
export const MOCK_ROOMS: Room[] = [
  ...BASE_ROOMS,
  ...Array.from({ length: 36 }, (_, index) => {
    const roomIndex = index + 10;
    return {
      id: String(roomIndex),
      roomNo: String(roomIndex).padStart(4, "0"),
      roomType: EXTRA_ROOM_TYPES[index % EXTRA_ROOM_TYPES.length],
      bedType: EXTRA_BED_TYPES[index % EXTRA_BED_TYPES.length],
      status: EXTRA_STATUSES[index % EXTRA_STATUSES.length],
    };
  }),
];
