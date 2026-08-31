"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

// Native <input type="date"> can't be restyled — its calendar popup is a
// browser/OS widget with no CSS hook for the selected-day color. This swaps
// it for react-day-picker (already a project dependency) so the selected
// day can be highlighted in the brand orange per the mockup; see the
// `.analytics-date-picker` rules in globals.css for the actual color hookup.
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const disabledMatchers = [
    ...(min ? [{ before: min }] : []),
    ...(max ? [{ after: max }] : []),
  ];

  return (
    <div ref={containerRef} className="relative">
      <label className="flex items-center gap-1.5 text-xs text-brand-muted">
        {label}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-1.5 rounded-md border border-brand-border px-2 py-1 text-xs text-brand-body hover:bg-brand-surface-alt"
        >
          {format(value, "d MMM yyyy")}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brand-muted">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </label>

      {isOpen && (
        <div
          className="fixed top-24 left-1/2 z-20 max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-x-auto rounded-md
            border border-brand-border bg-white p-2 shadow-lg sm:absolute sm:top-auto sm:left-auto sm:right-0
            sm:mt-1 sm:translate-x-0"
        >
          <DayPicker
            className="analytics-date-picker"
            mode="single"
            weekStartsOn={1}
            captionLayout="dropdown"
            defaultMonth={value}
            selected={value}
            disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
            onSelect={(date) => {
              // react-day-picker fires onSelect(undefined) in single mode
              // when the already-selected day is clicked again (it reads as
              // a deselect) — close the popup either way, only refetch when
              // a real date came back, so re-clicking today's value doesn't
              // leave the calendar stuck open.
              setIsOpen(false);
              if (date) onChange(date);
            }}
          />
        </div>
      )}
    </div>
  );
}
