"use client";

import { useMemo, useState } from "react";
import { RoomStatusSelect } from "@/features/room-management/components/room-status-select";
import type { Room, RoomStatus } from "@/types/rooms";

const PAGE_SIZE = 9;

type RoomManagementViewProps = {
  rooms: Room[];
};

export function RoomManagementView({
  rooms: initialRooms,
}: RoomManagementViewProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rooms;

    return rooms.filter((room) => {
      return (
        room.roomNo.toLowerCase().includes(normalized) ||
        room.roomType.toLowerCase().includes(normalized) ||
        room.bedType.toLowerCase().includes(normalized) ||
        room.status.toLowerCase().includes(normalized)
      );
    });
  }, [rooms, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRooms = filteredRooms.slice(startIndex, startIndex + PAGE_SIZE);

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  async function handleStatusChange(roomId: string, status: RoomStatus) {
    const previousRooms = rooms;
    setUpdatingRoomId(roomId);
    setRooms((current) =>
      current.map((room) => (room.id === roomId ? { ...room, status } : room)),
    );

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update room status");
      }

      const payload = (await response.json()) as {
        data?: Room;
      };

      if (payload.data?.status) {
        setRooms((current) =>
          current.map((room) =>
            room.id === roomId
              ? { ...room, status: payload.data!.status }
              : room,
          ),
        );
      }
    } catch (error) {
      console.error("[room-management] Failed to update status:", error);
      setRooms(previousRooms);
    } finally {
      setUpdatingRoomId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-[#F7F8FA]">
      {/* Top bar — full width of content pane */}
      <header className="flex h-[72px] w-full shrink-0 items-center justify-between bg-white px-10">
        <h1 className="text-[20px] font-medium text-[#222222]">
          Room Management
        </h1>

        <div className="flex items-center gap-3">
          <label className="relative block w-[240px]">
            <span className="sr-only">Search rooms</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#A0A7B0]">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search..."
              className="h-10 w-full rounded-[4px] border border-[#D0D5DD] bg-white pr-3 pl-9 text-[14px] text-[#4A4A4A] outline-none placeholder:text-[#A0A7B0]"
            />
          </label>

          <button
            type="button"
            className="flex h-10 items-center rounded-[4px] bg-[#C34A2C] px-4 text-[14px] font-medium text-white"
          >
            + Create Room
          </button>
        </div>
      </header>

      {/* Content pane — tall card, rows stretch to fill */}
      <div className="flex min-h-0 w-full flex-1 flex-col px-10 pt-6 pb-8">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[4px] bg-white">
          <div className="flex h-12 shrink-0 items-center bg-[#E9ECF1] text-[13px] font-medium text-[#667085]">
            <div className="w-[16%] px-6">Room no.</div>
            <div className="w-[34%] px-6">Room type</div>
            <div className="w-[25%] px-6">Bed Type</div>
            <div className="w-[25%] px-6">Status</div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {pageRooms.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-[14px] text-[#9CA3AF]">
                No rooms found.
              </div>
            ) : (
              pageRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex min-h-0 flex-1 items-center border-b border-[#F0F1F5] last:border-b-0"
                >
                  <div className="w-[16%] px-6 text-[14px] text-[#344054]">
                    {room.roomNo}
                  </div>
                  <div className="w-[34%] px-6 text-[14px] text-[#344054]">
                    {room.roomType}
                  </div>
                  <div className="w-[25%] px-6 text-[14px] text-[#344054]">
                    {room.bedType}
                  </div>
                  <div className="w-[25%] px-6">
                    <RoomStatusSelect
                      status={room.status}
                      disabled={updatingRoomId === room.id}
                      onChange={(status) => handleStatusChange(room.id, status)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination outside card */}
        <div className="mt-6 flex shrink-0 items-center justify-center gap-2.5">
          <PaginationButton
            label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </PaginationButton>

          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            const active = pageNumber === currentPage;

            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-[3px] text-[14px] ${
                  active
                    ? "border border-[#D0D5DD] bg-white text-[#344054]"
                    : "text-[#98A2B3]"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}

          <PaginationButton
            label="Next page"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </PaginationButton>
        </div>
      </div>
    </div>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center text-[#98A2B3] disabled:text-[#D0D5DD]"
    >
      {children}
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="11"
        cy="11"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m16.2 16.2 3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m14.5 6.5-5 5.5 5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m9.5 6.5 5 5.5-5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
