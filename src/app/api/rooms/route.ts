import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { getRooms } from "@/server/queries/rooms.query";
import { MOCK_ROOMS } from "@/lib/rooms/mock-data";

export async function GET() {
  try {
    if (!hasDatabaseUrl()) {
      return NextResponse.json({
        source: "mock",
        data: MOCK_ROOMS,
      });
    }

    const rooms = await getRooms();
    return NextResponse.json({
      source: "database",
      data: rooms,
    });
  } catch (error) {
    console.error("[api/rooms] GET failed:", error);
    return NextResponse.json(
      {
        source: "mock",
        error: "Failed to fetch rooms from database",
        data: MOCK_ROOMS,
      },
      { status: 500 },
    );
  }
}
