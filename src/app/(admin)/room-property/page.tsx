import type { Metadata } from "next";
import Link from "next/link";
import { getRooms } from "@/server/queries/room-types.query";
import { RoomsTable } from "@/features/rooms/components/RoomsTable";
import { RoomSearchForm } from "@/features/rooms/components/RoomSearchForm";
import { Pagination } from "@/features/rooms/components/Pagination";
import { PlusIcon } from "@/components/icons/PlusIcon";

export const metadata: Metadata = {
  title: "Room & Property | Neatly Hotel Admin",
};

export default async function RoomPropertyPage(props: PageProps<"/room-property">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" && searchParams.q.trim() ? searchParams.q.trim() : undefined;
  const pageParam = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const { rooms, totalPages } = await getRooms({ query, page });

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-white px-8 py-5">
        <h1 className="text-2xl font-semibold text-brand-body">Room & Property</h1>

        <div className="flex items-center gap-3">
          <RoomSearchForm defaultValue={query} />
          <Link
            href="/room-property/create"
            className="flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Create Room
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="overflow-hidden rounded-lg border border-brand-border bg-white">
          <RoomsTable rooms={rooms} />
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} query={query} />
    </div>
  );
}
