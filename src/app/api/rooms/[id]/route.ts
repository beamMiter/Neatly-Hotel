import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { deleteRoom, updateRoomStatus } from "@/server/queries/rooms.query";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";
import { ROOM_STATUSES, type RoomStatus } from "@/types/rooms";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isRoomStatus(value: unknown): value is RoomStatus {
  return (
    typeof value === "string" && ROOM_STATUSES.includes(value as RoomStatus)
  );
}

function databaseUnavailableResponse() {
  return NextResponse.json(
    { error: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
    { status: 503 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

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
    const body = (await request.json()) as { status?: unknown };

    if (!isRoomStatus(body.status)) {
      return NextResponse.json(
        { error: "Invalid room status" },
        { status: 400 },
      );
    }

    const room = await updateRoomStatus(id, body.status);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      source: "database",
      data: room,
    });
  } catch (error) {
    console.error("[api/rooms/[id]] PATCH failed:", error);
    return NextResponse.json(
      { error: "Failed to update room status" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

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
    const deleted = await deleteRoom(id);

    if (!deleted) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      source: "database",
      data: { id },
    });
  } catch (error) {
    console.error("[api/rooms/[id]] DELETE failed:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 },
    );
  }
}
