import { NextResponse } from "next/server";
import { parseCreateRoomFormData } from "@/features/rooms/validations";
import { createRoomType } from "@/server/queries/room-types.query";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";
import { roomTypeFailureResponse } from "@/server/services/room-type-errors";

export async function POST(request: Request) {
  try {
    await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseCreateRoomFormData(formData);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const result = await createRoomType(parsed);
  if (!result.success) return roomTypeFailureResponse(result);

  return NextResponse.json({ message: "Room created", id: result.id }, { status: 201 });
}
