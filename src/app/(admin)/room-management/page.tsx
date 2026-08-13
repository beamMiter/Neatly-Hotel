import type { Metadata } from "next";
import { RoomManagementView } from "@/features/room-management/components/room-management-view";
import { MOCK_ROOMS } from "@/lib/rooms/mock-data";
import { hasDatabaseUrl } from "@/server/db";
import { getRooms } from "@/server/queries/rooms.query";

export const metadata: Metadata = {
  title: "Room Management | NEATLY Admin",
  description: "View room list and status",
};

export const dynamic = "force-dynamic";

async function loadRooms() {
  if (!hasDatabaseUrl()) {
    return MOCK_ROOMS;
  }

  try {
    return await getRooms();
  } catch (error) {
    console.error("[room-management] Failed to load rooms from DB:", error);
    return MOCK_ROOMS;
  }
}

export default async function RoomManagementPage() {
  const rooms = await loadRooms();
  return <RoomManagementView rooms={rooms} />;
}
