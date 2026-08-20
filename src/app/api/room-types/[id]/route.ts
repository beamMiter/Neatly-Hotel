import { NextResponse } from "next/server";
import { parseUpdateRoomFormData } from "@/features/rooms/validations";
import { deleteRoomType, updateRoomType } from "@/server/queries/room-types.query";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseUpdateRoomFormData(formData);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const result = await updateRoomType({ id, ...parsed });
  if (!result.success) {
    return NextResponse.json({ message: result.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Room updated" }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const result = await deleteRoomType(id);
  if (!result.success) {
    return NextResponse.json({ message: result.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Room deleted" }, { status: 200 });
}
