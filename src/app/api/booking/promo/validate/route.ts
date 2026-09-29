import { NextResponse } from "next/server";
import { parseValidatePromoBody } from "@/features/booking-promo/validations";
import { hasDatabaseUrl } from "@/server/db";
import { validatePromotionCode } from "@/server/queries/promo.query";

// Live preview only, called while typing a promo code in the wizard's
// payment step — POST /api/bookings independently re-resolves the code as
// the authoritative value at submit time, this endpoint's result is never
// trusted for the actual charge.
export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseValidatePromoBody(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.message, fieldErrors: parsed.fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await validatePromotionCode(parsed.data);
    return NextResponse.json({ source: "database", data: result });
  } catch (error) {
    console.error("[api/booking/promo/validate] POST failed:", error);
    return NextResponse.json({ error: "Failed to validate promotion code" }, { status: 500 });
  }
}
