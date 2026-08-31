import { NextResponse } from "next/server";
import { getWebsiteTraffic, getWebsiteTrafficPages, type TrafficRangeKey } from "@/server/queries/analytics.query";

const VALID_RANGES: TrafficRangeKey[] = ["realtime", "yesterday", "7d", "30d"];

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const rangeParam = searchParams.get("range");
  const range: TrafficRangeKey = VALID_RANGES.includes(rangeParam as TrafficRangeKey)
    ? (rangeParam as TrafficRangeKey)
    : "realtime";

  const pageParam = searchParams.get("page") ?? "all";
  const validPages = await getWebsiteTrafficPages();
  const page = validPages.some((option) => option.key === pageParam) ? pageParam : "all";

  const data = await getWebsiteTraffic(range, page);
  return NextResponse.json({ data });
}
