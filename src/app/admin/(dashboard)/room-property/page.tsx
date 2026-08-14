import type { Metadata } from "next";
import { getRooms } from "@/features/rooms/queries";
import { RoomsTable } from "@/features/rooms/components/RoomsTable";
import { RoomSearchForm } from "@/features/rooms/components/RoomSearchForm";
import { Pagination } from "@/features/rooms/components/Pagination";
import { PlusIcon } from "@/components/icons/PlusIcon";

export const metadata: Metadata = {
  title: "Room & Property | Neatly Hotel Admin",
};

export default async function RoomPropertyPage(props: PageProps<"/admin/room-property">) {
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
          <button
            type="button"
            className="flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Create Room
          </button>
        </div>
      </header>

      <div className="flex-1 px-8 py-6">
        <div className="overflow-hidden rounded-lg border border-brand-border bg-white">
          <RoomsTable rooms={rooms} />
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} query={query} />
    </div>
  );
}
