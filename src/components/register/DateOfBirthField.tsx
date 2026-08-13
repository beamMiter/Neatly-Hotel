"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";
import { CalendarIcon } from "@/src/components/icons/CalendarIcon";

type DateOfBirthFieldProps = {
  id: string;
  name: string;
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  error?: string;
};

export function DateOfBirthField({ id, name, label, value, onChange, error }: DateOfBirthFieldProps) {
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
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor={id} className="text-sm text-brand-body">
        {label}
      </label>
      <div className="relative">
        <input type="hidden" name={name} value={value ? value.toISOString() : ""} />
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-11 w-full rounded-md border bg-white px-3.5 pr-10 text-left text-sm focus:outline-none focus:ring-1 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-brand-border focus:border-brand-primary focus:ring-brand-primary"
          } ${value ? "text-brand-body" : "text-brand-muted"}`}
        >
          {value ? format(value, "dd MMM yyyy") : "Select your date of birth"}
        </button>
        <CalendarIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />

        {isOpen && (
          <div className="absolute z-30 mt-2 rounded-md border border-brand-border bg-white p-2 shadow-lg">
            <DayPicker
              mode="single"
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setIsOpen(false);
              }}
              captionLayout="dropdown"
              startMonth={new Date(new Date().getFullYear() - 120, 0)}
              endMonth={new Date()}
              disabled={{ after: new Date() }}
              defaultMonth={value ?? new Date(new Date().getFullYear() - 25, 0)}
              style={{
                ["--rdp-accent-color" as string]: "var(--color-brand-primary)",
                ["--rdp-accent-background-color" as string]: "var(--color-brand-surface)",
                ["--rdp-today-color" as string]: "var(--color-brand-primary)",
              }}
            />
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
