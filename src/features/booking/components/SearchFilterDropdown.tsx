"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import {
  SEARCH_PRICE_MAX,
  SEARCH_PRICE_MIN,
  appendSearchFilterParams,
  isPriceFilterApplied,
  type SearchQuery,
  type SearchSort,
} from "@/types/room-search";

type SearchFilterDropdownProps = {
  query: SearchQuery;
};

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
];

const PRICE_SPAN = SEARCH_PRICE_MAX - SEARCH_PRICE_MIN;

function formatFilterPrice(amount: number): string {
  return `${amount.toLocaleString("en-US")} ฿`;
}

function parsePriceInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return SEARCH_PRICE_MIN;
  return Number.parseInt(digits, 10);
}

function clampPrice(value: number): number {
  return Math.min(SEARCH_PRICE_MAX, Math.max(SEARCH_PRICE_MIN, value));
}

function stayParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set("checkIn", query.checkIn);
  params.set("checkOut", query.checkOut);
  params.set("rooms", String(query.rooms));
  params.set("guests", String(query.guests));
  return params;
}

function RadioCheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchFilterDropdown({ query }: SearchFilterDropdownProps) {
  const router = useRouter();
  const appliedMin = query.minPrice ?? SEARCH_PRICE_MIN;
  const appliedMax = query.maxPrice ?? SEARCH_PRICE_MAX;
  const appliedSort = query.sort ?? "recommended";
  const appliedFilterCount = isPriceFilterApplied(appliedMin, appliedMax) ? 1 : 0;
  const clearEnabled = appliedFilterCount > 0;

  const [isOpen, setIsOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(appliedMin);
  const [maxPrice, setMaxPrice] = useState(appliedMax);
  const [sort, setSort] = useState<SearchSort>(appliedSort);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const navigateWithFilters = (next: {
    minPrice: number;
    maxPrice: number;
    sort: SearchSort;
  }) => {
    const params = stayParams(query);
    appendSearchFilterParams(params, next);
    router.push(`/search?${params.toString()}`);
  };

  const handleMinChange = (raw: number) => {
    const next = Math.min(clampPrice(raw), maxPrice);
    setMinPrice(next);
  };

  const handleMaxChange = (raw: number) => {
    const next = Math.max(clampPrice(raw), minPrice);
    setMaxPrice(next);
  };

  const handleApply = () => {
    navigateWithFilters({ minPrice, maxPrice, sort });
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setMinPrice(appliedMin);
    setMaxPrice(appliedMax);
    setSort(appliedSort);
    setIsOpen(true);
  };

  const handleClear = () => {
    if (!clearEnabled) return;
    setMinPrice(SEARCH_PRICE_MIN);
    setMaxPrice(SEARCH_PRICE_MAX);
    navigateWithFilters({
      minPrice: SEARCH_PRICE_MIN,
      maxPrice: SEARCH_PRICE_MAX,
      sort: appliedSort,
    });
  };

  const minPct = ((minPrice - SEARCH_PRICE_MIN) / PRICE_SPAN) * 100;
  const maxPct = ((maxPrice - SEARCH_PRICE_MIN) / PRICE_SPAN) * 100;

  return (
    <div className="relative w-full min-w-0 lg:w-48 lg:flex-none">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleToggle}
        className="flex h-12 w-full cursor-pointer items-center gap-2 rounded border border-[#D6D9E4] bg-white px-3 py-3"
      >
        <span className="[font-family:var(--font-inter)] text-base text-[#646D89]">Filters</span>
        {appliedFilterCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C14817] px-1.5 text-xs font-medium text-white">
            {appliedFilterCount}
          </span>
        ) : null}
        <ChevronDownIcon
          className={`ml-auto h-5 w-5 flex-none text-[#9AA1B9] transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div
            role="dialog"
            aria-label="Filters"
            className="absolute top-full right-0 z-20 mt-2 flex w-[min(20rem,calc(100vw-2rem))] max-h-[min(24rem,calc(100dvh-8rem))] origin-top flex-col overflow-hidden rounded border border-[#D6D9E4] bg-white shadow-[4px_4px_16px_rgba(0,0,0,0.08)] animate-[dropdown-in_150ms_ease-out] lg:w-80"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
              <section className="flex flex-col gap-3">
              <h3 className="[font-family:var(--font-inter)] text-sm text-[#9AA1B9]">Price Range</h3>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="[font-family:var(--font-inter)] text-xs text-[#9AA1B9]">Min</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Minimum price"
                    value={formatFilterPrice(minPrice)}
                    onChange={(event) => handleMinChange(parsePriceInput(event.target.value))}
                    className="h-10 w-full rounded border border-[#D6D9E4] bg-white px-3 [font-family:var(--font-inter)] text-base text-[#646D89] outline-none focus:border-[#C14817] focus:ring-1 focus:ring-[#C14817]"
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="[font-family:var(--font-inter)] text-xs text-[#9AA1B9]">Max</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Maximum price"
                    value={formatFilterPrice(maxPrice)}
                    onChange={(event) => handleMaxChange(parsePriceInput(event.target.value))}
                    className="h-10 w-full rounded border border-[#D6D9E4] bg-white px-3 [font-family:var(--font-inter)] text-base text-[#646D89] outline-none focus:border-[#C14817] focus:ring-1 focus:ring-[#C14817]"
                  />
                </label>
              </div>

              <div className="relative h-8 lg:h-6">
                <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[#E1E3EA]" />
                <div
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#C14817]"
                  style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 0)}%` }}
                />
                <input
                  type="range"
                  min={SEARCH_PRICE_MIN}
                  max={SEARCH_PRICE_MAX}
                  step={1}
                  value={minPrice}
                  aria-label="Minimum price slider"
                  onChange={(event) => handleMinChange(Number(event.target.value))}
                  className={`price-range-input absolute inset-0 w-full ${minPct > 50 ? "z-30" : "z-10"}`}
                />
                <input
                  type="range"
                  min={SEARCH_PRICE_MIN}
                  max={SEARCH_PRICE_MAX}
                  step={1}
                  value={maxPrice}
                  aria-label="Maximum price slider"
                  onChange={(event) => handleMaxChange(Number(event.target.value))}
                  className={`price-range-input absolute inset-0 w-full ${minPct > 50 ? "z-10" : "z-20"}`}
                />
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="[font-family:var(--font-inter)] text-sm text-[#9AA1B9]">Sort by</h3>
              <div role="radiogroup" aria-label="Sort by" className="flex flex-col">
                {SORT_OPTIONS.map((option) => {
                  const selected = sort === option.value;
                  return (
                    <label
                      key={option.value}
                      className="group flex cursor-pointer items-center gap-3 rounded px-1 py-2"
                    >
                      <input
                        type="radio"
                        name="search-sort"
                        value={option.value}
                        checked={selected}
                        onChange={() => setSort(option.value)}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-colors ${
                          selected
                            ? "border-[#C14817] bg-[#C14817]"
                            : "border-[#D6D9E4] group-hover:border-[#C14817] group-active:border-[#C14817]"
                        }`}
                      >
                        {selected ? <RadioCheckIcon /> : null}
                      </span>
                      <span
                        className={`[font-family:var(--font-inter)] text-sm ${
                          selected
                            ? "text-[#646D89]"
                            : "text-[#9AA1B9] group-hover:text-[#646D89] group-active:text-[#646D89]"
                        }`}
                      >
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#D6D9E4] p-4">
              <button
                type="button"
                disabled={!clearEnabled}
                onClick={handleClear}
                className="h-10 cursor-pointer rounded border border-[#D6D9E4] bg-white px-5 [font-family:var(--font-inter)] text-sm text-[#9AA1B9] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="h-10 cursor-pointer rounded bg-[#C14817] px-6 [font-family:var(--font-open-sans)] text-sm font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-95"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
