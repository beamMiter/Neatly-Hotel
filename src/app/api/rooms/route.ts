import { NextResponse } from "next/server";
import { createPhysicalRoomSchema } from "@/features/room-management/validations";
import { hasDatabaseUrl } from "@/server/db";
import { createRoom, getRooms } from "@/server/queries/rooms.query";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createPhysicalRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid room data" },
        { status: 400 },
      );
    }

    if (!hasDatabaseUrl()) {
      return NextResponse.json(
        {
          source: "mock",
          data: {
            id: `mock-${Date.now()}`,
            roomNo: "9999",
            roomType: parsed.data.roomType,
            bedType: parsed.data.bedType,
            status: parsed.data.status,
          },
        },
        { status: 201 },
      );
    }

    const room = await createRoom({
      roomType: parsed.data.roomType,
      roomTypeId: parsed.data.roomTypeId,
      bedType: parsed.data.bedType,
      status: parsed.data.status,
    });

    return NextResponse.json({ source: "database", data: room }, { status: 201 });
  } catch (error) {
    console.error("[api/rooms] POST failed:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
