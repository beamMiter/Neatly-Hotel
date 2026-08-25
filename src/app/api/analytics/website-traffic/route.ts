import { NextResponse } from "next/server";
import { getWebsiteTraffic, type TrafficRangeKey } from "@/server/queries/analytics.query";

const VALID_RANGES: TrafficRangeKey[] = ["realtime", "yesterday", "7d", "30d"];

export async function GET(request: Request) {
  const rangeParam = new URL(request.url).searchParams.get("range");
  const range: TrafficRangeKey = VALID_RANGES.includes(rangeParam as TrafficRangeKey)
    ? (rangeParam as TrafficRangeKey)
    : "realtime";

  const data = await getWebsiteTraffic(range);
  return NextResponse.json({ data });
}
