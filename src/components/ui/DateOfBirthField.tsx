"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format, isSameDay } from "date-fns";

type DateOfBirthFieldProps = {
  id: string;
  name: string;
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  error?: string;
  labelClassName?: string;
  buttonClassName?: string;
};

const DEFAULT_LABEL_CLASSNAME = "text-sm text-brand-body";
const DEFAULT_BUTTON_CLASSNAME =
  "h-11 rounded-md border bg-white px-3.5 pr-10 text-sm border-brand-border focus:border-brand-primary focus:ring-brand-primary";

// Same day-grid design language as the homepage search bar's calendar
// (src/components/ui/DatePicker.tsx) — rounded-full days, burnt-orange
// selected state, single-letter weekday row. Deliberately a single month
// (not the search bar's side-by-side two months, since this picks one date
// not a range) with month/year <select>s added on top of it — a birth date
// can be many decades back, and the search bar's prev/next-month-only
// header would take hundreds of clicks to reach it.
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type CalendarDay = { date: Date; inCurrentMonth: boolean };

// Native <select> was used for month/year at first, but its open-state
// dropdown is rendered by the OS, not us — no way to style it, so it looks
// completely disconnected from the rest of the calendar. This is a small
// custom listbox instead, styled like everything else here.
function MiniSelect<T extends string | number>({
  value,
  options,
  renderLabel,
  onChange,
}: {
  value: T;
  options: T[];
  renderLabel: (option: T) => string;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex cursor-pointer items-center gap-1.5 rounded border border-[#D6D9E4] bg-white px-2 py-1 [font-family:var(--font-inter)] text-sm text-[#2A2E3F] hover:border-[#C14817] focus:outline-none"
      >
        {renderLabel(value)}
        <span className="text-xs text-[#9AA1B9]">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 max-h-52 min-w-full overflow-y-auto rounded border border-[#D6D9E4] bg-white py-1 shadow-lg">
          {options.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                ref={selected ? selectedRef : undefined}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer px-3 py-1.5 text-left whitespace-nowrap [font-family:var(--font-inter)] text-sm ${
                  selected ? "bg-[#FBEAE0] font-medium text-[#C14817]" : "text-[#2A2E3F] hover:bg-gray-100"
                }`}
              >
                {renderLabel(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];
  for (let i = startOffset; i > 0; i--) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i + 1), inCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), inCurrentMonth: true });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inCurrentMonth: false });
  }
  return days;
}

export function DateOfBirthField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  labelClassName = DEFAULT_LABEL_CLASSNAME,
  buttonClassName = DEFAULT_BUTTON_CLASSNAME,
}: DateOfBirthFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const defaultView = value ?? new Date(today.getFullYear() - 25, 0);
  const [viewYear, setViewYear] = useState(defaultView.getFullYear());
  const [viewMonth, setViewMonth] = useState(defaultView.getMonth());
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

  function handlePrevMonth() {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(prev.getFullYear());
    setViewMonth(prev.getMonth());
  }

  function handleNextMonth() {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function handleSelectDay(date: Date) {
    onChange(date);
    setIsOpen(false);
  }

  const days = getCalendarDays(viewYear, viewMonth);
  const yearOptions = Array.from({ length: 121 }, (_, i) => today.getFullYear() - i);
  const monthOptions = Array.from({ length: 12 }, (_, m) => m);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor={id} className={labelClassName}>
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
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full cursor-pointer text-left focus:outline-none focus:ring-1 ${buttonClassName} ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          } ${value ? "" : "text-brand-muted"}`}
        >
          {value ? format(value, "EEE, d MMMM yyyy") : "Select your date of birth"}
        </button>
        <Image
          src="/images/icon/calender.svg"
          alt=""
          width={24}
          height={24}
          className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
        />

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

            <div className="absolute top-full left-0 z-20 mt-2 flex w-max origin-top flex-col gap-4 rounded border border-[#D6D9E4] bg-white p-4 shadow-lg animate-[dropdown-in_150ms_ease-out]">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#9AA1B9]"
                >
                  ‹
                </button>

                <div className="flex gap-2">
                  <MiniSelect
                    value={viewMonth}
                    options={monthOptions}
                    renderLabel={(month) => format(new Date(2000, month, 1), "MMMM")}
                    onChange={setViewMonth}
                  />
                  <MiniSelect value={viewYear} options={yearOptions} renderLabel={String} onChange={setViewYear} />
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center text-[#9AA1B9]"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-2">
                {WEEKDAY_LABELS.map((weekdayLabel, index) => (
                  <span key={index} className="flex h-8 w-8 items-center justify-center text-xs text-[#9AA1B9]">
                    {weekdayLabel}
                  </span>
                ))}

                {days.map(({ date, inCurrentMonth }, index) => {
                  const isFuture = date > today;
                  const isDisabled = !inCurrentMonth || isFuture;
                  const isSelected = value ? isSameDay(date, value) : false;

                  return (
                    <button
                      type="button"
                      key={index}
                      disabled={isDisabled}
                      onClick={() => handleSelectDay(date)}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm [font-family:var(--font-inter)] transition-colors duration-150 disabled:cursor-default ${
                        isDisabled ? "text-[#D6D9E4]" : "text-[#2A2E3F]"
                      } ${
                        isSelected
                          ? "animate-[date-pop_250ms_ease-out] bg-[#C14817] text-white"
                          : !isDisabled
                            ? "hover:bg-gray-100"
                            : ""
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
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
