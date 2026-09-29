"use client";

import { useEffect, useRef, useState } from "react";

export function PeriodDropdown<Period extends string>({
  value,
  options,
  onChange,
}: {
  value: Period;
  options: { key: Period; label: string }[];
  onChange: (period: Period) => void;
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

  const selectedLabel = options.find((option) => option.key === value)?.label ?? options[0]?.label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-body transition-[background-color,transform] duration-150 hover:bg-brand-surface-alt active:scale-95"
      >
        {selectedLabel}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="shrink-0 text-brand-muted">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <ul className="absolute right-0 z-10 mt-1 w-36 origin-top-right animate-[dropdown-in_150ms_ease-out] rounded-md border border-brand-border bg-white py-1 shadow-md">
          {options.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.key);
                  setIsOpen(false);
                }}
                className={`block w-full px-3 py-1.5 text-left text-xs transition-colors duration-150 ${
                  option.key === value
                    ? "bg-brand-surface-alt font-medium text-brand-body"
                    : "text-brand-body hover:bg-brand-surface-alt"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
