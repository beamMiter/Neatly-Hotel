import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { updateRoomStatus } from "@/server/queries/rooms.query";
import { ROOM_STATUSES, type RoomStatus } from "@/types/rooms";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isRoomStatus(value: unknown): value is RoomStatus {
  return (
    typeof value === "string" && ROOM_STATUSES.includes(value as RoomStatus)
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { status?: unknown };

    if (!isRoomStatus(body.status)) {
      return NextResponse.json(
        { error: "Invalid room status" },
        { status: 400 },
      );
    }

    if (!hasDatabaseUrl()) {
      return NextResponse.json({
        source: "mock",
        data: { id, status: body.status },
      });
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
