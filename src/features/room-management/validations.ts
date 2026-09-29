import { z } from "zod";
import { BED_TYPES, ROOM_STATUSES } from "@/types/rooms";
import { UUID_PATTERN } from "@/lib/validation-patterns";

export const createPhysicalRoomSchema = z.object({
  roomNo: z
    .string({ message: "Room no. is required" })
    .trim()
    .min(1, "Room no. is required")
    .max(16, "Room no. is too long")
    .regex(/^\d+$/, "Room no. must contain numbers only"),
  roomType: z
    .string({ message: "Room type is required" })
    .trim()
    .min(1, "Room type is required")
    .max(100, "Room type is too long"),
  roomTypeId: z.string().regex(UUID_PATTERN).optional().nullable(),
  bedType: z.enum(BED_TYPES, { message: "Bed type is required" }),
  status: z.enum(ROOM_STATUSES, { message: "Status is required" }),
});

export type CreatePhysicalRoomInput = z.infer<typeof createPhysicalRoomSchema>;

export type CreatePhysicalRoomFieldErrors = Partial<
  Record<keyof CreatePhysicalRoomInput, string>
>;
