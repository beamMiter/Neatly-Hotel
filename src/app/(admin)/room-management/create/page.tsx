import type { Metadata } from "next";
import { CreateRoomForm } from "@/features/room-management/components/create-room-form";
import { hasDatabaseUrl } from "@/server/db";
import { getRoomTypeOptions } from "@/server/queries/rooms.query";
import type { RoomTypeOption } from "@/types/rooms";

export const metadata: Metadata = {
  title: "Create Room | NEATLY Admin",
  description: "Create a new physical room",
};

export const dynamic = "force-dynamic";

async function loadRoomTypes(): Promise<RoomTypeOption[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    return await getRoomTypeOptions();
  } catch (error) {
    console.error("[room-management/create] Failed to load room types:", error);
    return [];
  }
}

export default async function CreateRoomPage() {
  const roomTypes = await loadRoomTypes();

  return <CreateRoomForm roomTypes={roomTypes} />;
}
