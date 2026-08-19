import type { Metadata } from "next";
import { RoomManagementView } from "@/features/room-management/components/room-management-view";
import { hasDatabaseUrl } from "@/server/db";
import { getRooms } from "@/server/queries/rooms.query";

export const metadata: Metadata = {
  title: "Room Management | NEATLY Admin",
  description: "View room list and status",
};

export const dynamic = "force-dynamic";

export default async function RoomManagementPage() {
  if (!hasDatabaseUrl()) {
    return (
      <DatabaseRequiredMessage message="Room Management requires DATABASE_URL (Supabase Postgres) in .env.local." />
    );
  }

  try {
    const rooms = await getRooms();
    return <RoomManagementView rooms={rooms} />;
  } catch (error) {
    console.error("[room-management] Failed to load rooms from Supabase:", error);
    return (
      <DatabaseRequiredMessage message="Could not load rooms from Supabase. Check DATABASE_URL and try again." />
    );
  }
}

function DatabaseRequiredMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-[#F7F8FA]">
      <header className="flex h-[72px] w-full shrink-0 items-center bg-white px-10">
        <h1 className="text-[20px] font-medium text-[#222222]">Room Management</h1>
      </header>
      <div className="flex flex-1 items-center justify-center px-10">
        <p className="max-w-md text-center text-[14px] text-[#667085]">{message}</p>
      </div>
    </div>
  );
}
