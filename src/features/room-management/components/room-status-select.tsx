"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RoomStatusBadge } from "@/features/room-management/components/room-status-badge";
import { ROOM_STATUSES, type RoomStatus } from "@/types/rooms";

type RoomStatusSelectProps = {
  status: RoomStatus;
  disabled?: boolean;
  onChange: (status: RoomStatus) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  maxHeight: number;
};

const MENU_WIDTH = 260;
const MENU_GAP = 8;
const VIEWPORT_PADDING = 12;

export function RoomStatusSelect({
  status,
  disabled = false,
  onChange,
}: RoomStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredStatuses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ROOM_STATUSES;

    return ROOM_STATUSES.filter((item) =>
      item.toLowerCase().includes(normalized),
    );
  }, [query]);

  function closeMenu() {
    setOpen(false);
    setQuery("");
    setMenuPosition(null);
  }

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const searchSectionHeight = 68;
    const spaceBelow =
      window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_PADDING;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_PADDING;
    const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow;

    const listMaxHeight = Math.max(
      160,
      (openUpward ? spaceAbove : spaceBelow) - searchSectionHeight,
    );

    setMenuPosition({
      left: Math.min(
        rect.left,
        window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING,
      ),
      top: openUpward
        ? rect.top - MENU_GAP - searchSectionHeight - listMaxHeight
        : rect.bottom + MENU_GAP,
      maxHeight: listMaxHeight,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      closeMenu();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    function handleReposition() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  function handleSelect(nextStatus: RoomStatus) {
    if (nextStatus !== status) {
      onChange(nextStatus);
    }

    closeMenu();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          if (open) {
            closeMenu();
            return;
          }

          setOpen(true);
          setQuery("");
        }}
        className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#C34A2C]/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RoomStatusBadge status={status} />
      </button>

      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: MENU_WIDTH,
              }}
              className="fixed z-50 overflow-hidden rounded-[4px] border border-[#E4E7EC] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.12)]"
            >
              <div className="border-b border-[#F0F1F5] p-3">
                <label className="relative block">
                  <span className="sr-only">Search status</span>
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#A0A7B0]">
                    <SearchIcon className="h-4 w-4" />
                  </span>
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search status..."
                    className="h-9 w-full rounded-[4px] border border-[#D0D5DD] bg-white pr-3 pl-9 text-[13px] text-[#344054] outline-none placeholder:text-[#A0A7B0]"
                  />
                </label>
              </div>

              <ul
                role="listbox"
                aria-label="Room status options"
                style={{ maxHeight: menuPosition.maxHeight }}
                className="overflow-y-auto overscroll-contain p-2 pb-3"
              >
                {filteredStatuses.length === 0 ? (
                  <li className="px-3 py-4 text-center text-[13px] text-[#98A2B3]">
                    No status found.
                  </li>
                ) : (
                  filteredStatuses.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={item === status}
                        onClick={() => handleSelect(item)}
                        className="flex w-full cursor-pointer items-center rounded-[4px] px-2 py-2 text-left transition-colors hover:bg-[#F9FAFB]"
                      >
                        <RoomStatusBadge status={item} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
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
