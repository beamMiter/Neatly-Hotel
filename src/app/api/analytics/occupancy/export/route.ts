import { getOccupancyTrend } from "@/server/queries/analytics.query";
import { parseDateRange } from "@/features/analytics/parse-date-range";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const range = parseDateRange(new URL(request.url).searchParams);
  const data = await getOccupancyTrend(range);
  const csv = toCsv(
    ["Month", "Occupancy Rate (%)"],
    data.map((point) => [point.month, point.ratePct]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="occupancy-trend.csv"',
    },
  });
}
