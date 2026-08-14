import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { RoomDetailView } from "@/features/booking/components/RoomDetailView";
import { getRoomTypeById } from "@/features/booking/mock-data";

type RoomDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: RoomDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const room = getRoomTypeById(id);

  return {
    title: room ? `${room.name} | Neatly Hotel` : "Room | Neatly Hotel",
    description: room?.description ?? "Room details at Neatly Hotel",
  };
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { id } = await params;
  const room = getRoomTypeById(id);

  if (!room) notFound();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <Navbar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RoomDetailView room={room} />
      </div>
    </div>
  );
}
