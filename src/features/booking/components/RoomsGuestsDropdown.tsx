"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";

type RoomsGuestsDropdownProps = {
  rooms: number;
  guests: number;
  onRoomsChange: (value: number) => void;
  onGuestsChange: (value: number) => void;
};

const MIN = 1;
const MAX = 10;

function CounterRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <span className="text-sm text-brand-body">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= MIN}
          onClick={() => onChange(Math.max(MIN, value - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-border text-brand-muted disabled:opacity-40"
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
        <span className="w-4 text-center text-sm text-brand-body">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= MAX}
          onClick={() => onChange(Math.min(MAX, value + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-border text-brand-muted disabled:opacity-40"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function RoomsGuestsDropdown({
  rooms,
  guests,
  onRoomsChange,
  onGuestsChange,
}: RoomsGuestsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const summary = `${rooms} room${rooms === 1 ? "" : "s"}, ${guests} guest${guests === 1 ? "" : "s"}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5" ref={containerRef}>
      <span className="text-sm text-brand-body">Rooms & Guests</span>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-12 w-full items-center justify-between rounded-sm border border-brand-border bg-white px-3.5 text-left text-sm text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          <span>{summary}</span>
          <ChevronDownIcon className="h-4 w-4 text-brand-muted" />
        </button>

        {isOpen && (
          <div className="absolute z-40 mt-1 w-full min-w-[220px] rounded-sm border border-brand-border bg-white px-4 shadow-lg">
            <CounterRow label="Room" value={rooms} onChange={onRoomsChange} />
            <div className="border-t border-brand-border" />
            <CounterRow label="Guest" value={guests} onChange={onGuestsChange} />
          </div>
        )}
      </div>
    </div>
  );
}
