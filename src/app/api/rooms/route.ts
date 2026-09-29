import { NextResponse } from "next/server";
import { createPhysicalRoomSchema } from "@/features/room-management/validations";
import { hasDatabaseUrl } from "@/server/db";
import { createRoom, getRooms } from "@/server/queries/rooms.query";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";

function databaseUnavailableResponse() {
  return NextResponse.json(
    { error: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
    { status: 503 },
  );
}

export async function GET() {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  try {
    await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }

  try {
    const rooms = await getRooms();
    return NextResponse.json({
      source: "database",
      data: rooms,
    });
  } catch (error) {
    console.error("[api/rooms] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms from Supabase" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  try {
    await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }

  try {
    const body = (await request.json()) as unknown;
    const parsed = createPhysicalRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid room data" },
        { status: 400 },
      );
    }

    const room = await createRoom({
      roomNo: parsed.data.roomNo,
      roomType: parsed.data.roomType,
      roomTypeId: parsed.data.roomTypeId,
      bedType: parsed.data.bedType,
      status: parsed.data.status,
    });

    return NextResponse.json({ source: "database", data: room }, { status: 201 });
  } catch (error) {
    console.error("[api/rooms] POST failed:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This room number already exists. Please use a different one." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
