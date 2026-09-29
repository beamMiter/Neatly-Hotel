import type { Metadata } from "next";
import { CreateRoomForm } from "@/features/rooms/components/CreateRoomForm";

export const metadata: Metadata = {
  title: "Create Room | Room & Property | Neatly Hotel Admin",
};

export default function CreateRoomPage() {
  return <CreateRoomForm />;
}
