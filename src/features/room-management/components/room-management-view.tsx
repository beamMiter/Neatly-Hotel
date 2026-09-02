"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/server/db/supabase-browser";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { RoomDeleteDialog } from "@/features/room-management/components/room-delete-dialog";
import { RoomActionToast } from "@/features/room-management/components/room-action-toast";
import { RoomStatusSelect } from "@/features/room-management/components/room-status-select";
import { formatRoomLocation } from "@/lib/rooms/layout-rooms";
import type { Room, RoomStatus } from "@/types/rooms";

const PAGE_SIZE = 9;

type RoomManagementViewProps = {
  rooms: Room[];
};

type DeleteFeedback =
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function RoomManagementView({
  rooms: initialRooms,
}: RoomManagementViewProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);
  const refreshRequestId = useRef(0);

  const refreshRooms = useCallback(async () => {
    const requestId = ++refreshRequestId.current;

    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to refresh rooms");

      const payload = (await response.json()) as { data?: Room[] };
      if (requestId === refreshRequestId.current && payload.data) {
        setRooms(payload.data);
      }
    } catch (error) {
      console.error("[room-management] Realtime refresh failed:", error);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("room-management:rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => void refreshRooms(),
      )
      .subscribe((status) => {
        // Re-fetch after the initial connection and every reconnect so events
        // that happened while this tab was offline cannot leave stale state.
        if (status === "SUBSCRIBED") void refreshRooms();
      });

    return () => {
      refreshRequestId.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [refreshRooms]);

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rooms;

    return rooms.filter((room) => {
      const location = formatRoomLocation(room)?.toLowerCase() ?? "";
      return (
        room.roomNo.toLowerCase().includes(normalized) ||
        room.roomType.toLowerCase().includes(normalized) ||
        room.bedType.toLowerCase().includes(normalized) ||
        room.status.toLowerCase().includes(normalized) ||
        location.includes(normalized)
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

  async function handleConfirmDelete() {
    if (!roomToDelete) return;

    const roomId = roomToDelete.id;
    const previousRooms = rooms;
    setDeletingRoomId(roomId);
    setRooms((current) => current.filter((room) => room.id !== roomId));
    setPage((currentPage) =>
      Math.min(
        currentPage,
        Math.max(1, Math.ceil((previousRooms.length - 1) / PAGE_SIZE)),
      ),
    );

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      setRoomToDelete(null);
      setDeleteFeedback({
        type: "success",
        message: `Room ${roomToDelete.roomNo} deleted successfully.`,
      });
    } catch (error) {
      console.error("[room-management] Failed to delete room:", error);
      setRooms(previousRooms);
      setDeleteFeedback({
        type: "error",
        message: "Unable to delete the room. Please try again.",
      });
    } finally {
      setDeletingRoomId(null);
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

          <Link
            href="/room-management/create"
            className="flex h-10 items-center gap-2 rounded-[4px] bg-[#C34A2C] px-4 text-[14px] font-medium text-white"
          >
            <PlusIcon className="h-4 w-4" />
            Create Room
          </Link>
        </div>
      </header>

      {/* Content pane — table card + pagination pinned to bottom */}
      <div className="flex min-h-0 flex-1 flex-col px-10 pt-6 pb-8">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="overflow-hidden rounded-[4px] bg-white">
            <div className="flex h-12 items-center bg-[#E9ECF1] text-[13px] font-medium text-[#667085]">
              <div className="w-[14%] px-6">Room no.</div>
              <div className="w-[30%] px-6">Room type</div>
              <div className="w-[22%] px-6">Bed Type</div>
              <div className="w-[24%] px-6">Status</div>
              <div className="w-[10%] px-4 text-center">Action</div>
            </div>

            {pageRooms.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[14px] text-[#9CA3AF]">
                No rooms found.
              </div>
            ) : (
              pageRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex min-h-16 items-center border-b border-[#F0F1F5] last:border-b-0"
                >
                  <div className="w-[14%] px-6">
                    <p className="text-[14px] text-[#344054]">{room.roomNo}</p>
                    {formatRoomLocation(room) ? (
                      <p className="text-[12px] text-[#98A2B3]">
                        {formatRoomLocation(room)}
                      </p>
                    ) : null}
                  </div>
                  <div className="w-[30%] px-6 text-[14px] text-[#344054]">
                    {room.roomType}
                  </div>
                  <div className="w-[22%] px-6 text-[14px] text-[#344054]">
                    {room.bedType}
                  </div>
                  <div className="w-[24%] px-6">
                    <RoomStatusSelect
                      status={room.status}
                      disabled={updatingRoomId === room.id}
                      onChange={(status) => handleStatusChange(room.id, status)}
                    />
                  </div>
                  <div className="flex w-[10%] justify-center px-4">
                    <button
                      type="button"
                      aria-label={`Delete room ${room.roomNo}`}
                      disabled={deletingRoomId === room.id}
                      onClick={() => setRoomToDelete(room)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[4px] text-[#98A2B3] transition-colors hover:bg-[#FEECE8] hover:text-[#C34A2C] disabled:cursor-default disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination — fixed at bottom of content area */}
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
                className={`flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-[3px] text-[14px] ${
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

      <RoomDeleteDialog
        room={roomToDelete}
        loading={Boolean(roomToDelete && deletingRoomId === roomToDelete.id)}
        onCancel={() => {
          if (deletingRoomId) return;
          setRoomToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
      <RoomActionToast
        feedback={deleteFeedback}
        onDismiss={() => setDeleteFeedback(null)}
      />
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
      className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#98A2B3] disabled:cursor-default disabled:text-[#D0D5DD]"
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 7h15M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2.25 0V18.5A1.5 1.5 0 0 1 15.75 20h-7.5A1.5 1.5 0 0 1 7 18.5V7h10.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10v6M14 10v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
