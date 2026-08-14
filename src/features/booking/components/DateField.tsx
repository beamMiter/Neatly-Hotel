"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker, type Matcher } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";
import { CalendarIcon } from "@/components/icons/CalendarIcon";

type DateFieldProps = {
  id: string;
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: Matcher | Matcher[];
  placeholder?: string;
};

export function DateField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder = "Select date",
}: DateFieldProps) {
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

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5" ref={containerRef}>
      <label htmlFor={id} className="text-sm text-brand-body">
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`flex h-12 w-full items-center rounded-sm border border-brand-border bg-white px-3.5 pr-10 text-left text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary ${
            value ? "text-brand-body" : "text-brand-muted"
          }`}
        >
          {value ? format(value, "EEE, d MMM yyyy") : placeholder}
        </button>
        <CalendarIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />

        {isOpen && (
          <div className="absolute z-40 mt-2 rounded-md border border-brand-border bg-white p-2 text-black shadow-lg">
            <DayPicker
              mode="single"
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setIsOpen(false);
              }}
              disabled={disabled}
              defaultMonth={value}
              className="text-black"
              style={{
                color: "#171717",
                ["--rdp-accent-color" as string]: "var(--color-brand-primary)",
                ["--rdp-accent-background-color" as string]: "var(--color-brand-surface)",
                ["--rdp-today-color" as string]: "var(--color-brand-primary)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
