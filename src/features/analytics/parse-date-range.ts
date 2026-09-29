import { startOfMonth, subMonths, endOfDay } from "date-fns";
import type { DateRange } from "@/types/analytics";

// Defaults to the last 6 months (matching the mockup's Jan-June example
// span) when the request doesn't specify a range.
export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date());
  const from = fromParam ? new Date(fromParam) : startOfMonth(subMonths(to, 5));

  return { from, to };
}
