import type { ChatbotSearchPhase, ChatbotSearchState } from "@/types/chatbot";

export type ChatbotDateValidationError =
  | "invalid_check_in"
  | "invalid_check_out"
  | "check_in_in_past"
  | "check_out_in_past"
  | "check_out_not_after_check_in";

export type ChatbotDateValidationResult =
  | { valid: true; error: null }
  | { valid: false; error: ChatbotDateValidationError };

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isSearchPhase(value: unknown): value is ChatbotSearchPhase {
  return value === "idle" || value === "collecting" || value === "results";
}

export function normalizeChatbotSearchState(value: unknown): ChatbotSearchState {
  if (!value || typeof value !== "object") {
    return { checkIn: null, checkOut: null, guests: null, budget: null, phase: "idle" };
  }

  const state = value as Partial<ChatbotSearchState>;
  const checkIn = typeof state.checkIn === "string" && isValidDate(state.checkIn) ? state.checkIn : null;
  const checkOut = typeof state.checkOut === "string" && isValidDate(state.checkOut) ? state.checkOut : null;
  const guests =
    typeof state.guests === "number" &&
    Number.isFinite(state.guests) &&
    Number.isInteger(state.guests) &&
    state.guests > 0 &&
    state.guests <= 20
      ? state.guests
      : null;
  const budget =
    typeof state.budget === "number" && Number.isFinite(state.budget) && state.budget > 0
      ? state.budget
      : null;
  const hasSearchData = Boolean(checkIn || checkOut || guests || budget);

  return {
    checkIn,
    checkOut,
    guests,
    budget,
    phase: isSearchPhase(state.phase) ? state.phase : hasSearchData ? "collecting" : "idle",
  };
}

export function getBangkokDate(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validateChatbotDateRange(
  search: Pick<ChatbotSearchState, "checkIn" | "checkOut">,
  now: Date = new Date(),
): ChatbotDateValidationResult {
  const { checkIn, checkOut } = search;

  if (checkIn && !isValidDate(checkIn)) return { valid: false, error: "invalid_check_in" };
  if (checkOut && !isValidDate(checkOut)) return { valid: false, error: "invalid_check_out" };

  const today = getBangkokDate(now);
  if (checkIn && checkIn < today) return { valid: false, error: "check_in_in_past" };
  if (checkOut && checkOut < today) return { valid: false, error: "check_out_in_past" };
  if (checkIn && checkOut && checkOut <= checkIn) {
    return { valid: false, error: "check_out_not_after_check_in" };
  }

  return { valid: true, error: null };
}
