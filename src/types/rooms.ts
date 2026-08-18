export const ROOM_STATUSES = [
  "Vacant",
  "Occupied",
  "Assign Clean",
  "Assign Dirty",
  "Vacant Clean",
  "Vacant Clean Inspected",
  "Vacant Clean Pick Up",
  "Occupied Clean",
  "Occupied Clean Inspected",
  "Occupied Dirty",
  "Out of Order",
  "Out of Service",
  "Out of Inventory",
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const BED_TYPES = [
  "Single Bed",
  "Twin Beds",
  "Double Bed",
  "Queen Bed",
  "King Bed",
  "Super King Bed",
  "Sofa Bed",
] as const;

export type BedType = (typeof BED_TYPES)[number];

export type Room = {
  id: string;
  roomNo: string;
  roomType: string;
  bedType: BedType;
  status: RoomStatus;
};

export type RoomTypeOption = {
  id: string | null;
  name: string;
  bedType: string | null;
};
