import { z } from "zod";
import { BED_TYPES, ROOM_STATUSES } from "@/types/rooms";

export const createPhysicalRoomSchema = z.object({
  roomType: z
    .string({ message: "Room type is required" })
    .trim()
    .min(1, "Room type is required")
    .max(100, "Room type is too long"),
  roomTypeId: z.string().uuid().optional().nullable(),
  bedType: z.enum(BED_TYPES, { message: "Bed type is required" }),
  status: z.enum(ROOM_STATUSES, { message: "Status is required" }),
});

export type CreatePhysicalRoomInput = z.infer<typeof createPhysicalRoomSchema>;

export type CreatePhysicalRoomFieldErrors = Partial<
  Record<keyof CreatePhysicalRoomInput, string>
>;
