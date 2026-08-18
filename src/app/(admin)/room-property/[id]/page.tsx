import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoomById } from "@/features/rooms/queries";
import { EditRoomForm } from "@/features/rooms/components/EditRoomForm";

export const metadata: Metadata = {
  title: "Edit Room | Room & Property | Neatly Hotel Admin",
};

export default async function RoomPropertyDetailPage(props: PageProps<"/room-property/[id]">) {
  const { id } = await props.params;
  const room = await getRoomById(id);

  if (!room) {
    notFound();
  }

  return <EditRoomForm room={room} />;
}
