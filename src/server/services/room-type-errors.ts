import { NextResponse } from "next/server";
import type { RoomTypeFailureKind } from "@/server/queries/room-types.query";

const STATUS_BY_KIND: Record<RoomTypeFailureKind, number> = {
  duplicate: 409,
  "in-use": 409,
  "image-upload": 502,
};

export function roomTypeFailureResponse(failure: { message: string; kind?: RoomTypeFailureKind }) {
  const status = failure.kind ? STATUS_BY_KIND[failure.kind] : 500;
  return NextResponse.json(
    {
      message: failure.message,
      kind: failure.kind,
      fieldErrors: failure.kind === "duplicate" ? { roomType: failure.message } : undefined,
    },
    { status },
  );
}
