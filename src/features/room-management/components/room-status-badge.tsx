import { ROOM_STATUS_STYLES } from "@/lib/rooms/room-status-styles";
import type { RoomStatus } from "@/types/rooms";

type RoomStatusBadgeProps = {
  status: RoomStatus;
};

export function RoomStatusBadge({ status }: RoomStatusBadgeProps) {
  const style = ROOM_STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-[12px] leading-none font-medium whitespace-nowrap ${style.className}`}
    >
      {status}
    </span>
  );
}
