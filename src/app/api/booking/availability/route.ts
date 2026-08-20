import { NextResponse } from "next/server";
import { getRoomTypeAvailability } from "@/server/queries/room-availability.query";
import { validateStayDates } from "@/features/booking/date-rules";
import { hasDatabaseUrl } from "@/server/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseCount(value: string, fallback: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const roomTypeId = first(searchParams.get("roomTypeId") ?? undefined);
  const checkIn = first(searchParams.get("checkIn") ?? undefined);
  const checkOut = first(searchParams.get("checkOut") ?? undefined);
  const guests = parseCount(first(searchParams.get("guests") ?? undefined), 1, 8);
  const rooms = parseCount(first(searchParams.get("rooms") ?? undefined), 1, 3);

  if (!UUID_PATTERN.test(roomTypeId)) {
    return NextResponse.json({ error: "A valid room type id is required" }, { status: 400 });
  }

  const dateError = validateStayDates(checkIn, checkOut);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  try {
    const availability = await getRoomTypeAvailability({
      roomTypeId,
      checkIn,
      checkOut,
      guests,
      rooms,
    });

    if (!availability) {
      return NextResponse.json({ error: "Room type not found" }, { status: 404 });
    }

    return NextResponse.json({ source: "database", data: availability });
  } catch (error) {
    console.error("[api/booking/availability] GET failed:", error);
    return NextResponse.json({ error: "Failed to check room availability" }, { status: 500 });
  }
}
