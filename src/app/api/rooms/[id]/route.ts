import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { deleteRoom } from "@/server/queries/rooms.query";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    if (!hasDatabaseUrl()) {
      return NextResponse.json({
        source: "mock",
        data: { id },
      });
    }

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
