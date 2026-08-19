import type { RoomStatus } from "@/types/rooms";

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
