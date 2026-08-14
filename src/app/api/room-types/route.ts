import { NextResponse } from "next/server";
import { parseCreateRoomFormData } from "@/features/rooms/validations";
import { createRoomType } from "@/features/rooms/queries";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseCreateRoomFormData(formData);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const result = await createRoomType(parsed);
  if (!result.success) {
    return NextResponse.json({ message: result.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Room created", id: result.id }, { status: 201 });
}
