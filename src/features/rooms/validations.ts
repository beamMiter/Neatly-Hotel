import { z } from "zod";
import { BED_TYPES } from "./types";

export const createRoomSchema = z.object({
  roomType: z
    .string({ message: "Room type is required" })
    .trim()
    .min(1, "Room type is required")
    .max(100, "Room type is too long"),
  roomSizeSqm: z.coerce
    .number({ message: "Room size is required" })
    .int("Room size must be a whole number")
    .positive("Room size must be greater than 0"),
  bedType: z.enum(BED_TYPES, { message: "Bed type is required" }),
  guests: z.coerce.number({ message: "Guests is required" }).int().positive("Guests must be at least 1"),
  price: z.coerce.number({ message: "Price is required" }).positive("Price must be greater than 0"),
  promotionPrice: z.coerce.number().positive("Promotion price must be greater than 0").nullable().optional(),
  description: z.string({ message: "Room description is required" }).trim().min(1, "Room description is required"),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type CreateRoomFieldErrors = Partial<Record<keyof CreateRoomInput, string>> & {
  mainImage?: string;
  gallery?: string;
  amenities?: string;
};

const CREATE_ROOM_TEXT_FIELDS = [
  "roomType",
  "roomSizeSqm",
  "bedType",
  "guests",
  "price",
  "promotionPrice",
  "description",
] as const;

export const MIN_GALLERY_IMAGES = 4;

// Must match the room-images storage bucket's configured restrictions.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function isValidRoomImage(file: File) {
  return file.size > 0 && file.size <= MAX_IMAGE_SIZE_BYTES && ALLOWED_IMAGE_TYPES.includes(file.type);
}

export type ParseCreateRoomFormDataResult =
  | { success: true; data: CreateRoomInput; mainImage: File; gallery: File[]; amenities: string[] }
  | { success: false; fieldErrors: CreateRoomFieldErrors };

// Shared by the client form (pre-submit check) and the API route (source of
// truth): coerces FormData into what createRoomSchema expects, plus the
// manual checks zod can't express for files/arrays.
export function parseCreateRoomFormData(formData: FormData): ParseCreateRoomFormDataResult {
  const record: Record<string, unknown> = {};
  for (const key of CREATE_ROOM_TEXT_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string" && value !== "") record[key] = value;
  }

  const parsed = createRoomSchema.safeParse(record);
  const fieldErrors: CreateRoomFieldErrors = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreateRoomFieldErrors | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  const mainImageEntry = formData.get("mainImage");
  const mainImage = mainImageEntry instanceof File && isValidRoomImage(mainImageEntry) ? mainImageEntry : null;
  if (!mainImage) {
    fieldErrors.mainImage =
      mainImageEntry instanceof File && mainImageEntry.size > 0
        ? "Image must be JPEG, PNG, WebP, or AVIF and under 5MB"
        : "Main image is required";
  }

  const gallery = formData
    .getAll("gallery")
    .filter((entry): entry is File => entry instanceof File && isValidRoomImage(entry));
  if (gallery.length < MIN_GALLERY_IMAGES) {
    fieldErrors.gallery = `Upload at least ${MIN_GALLERY_IMAGES} gallery images (JPEG, PNG, WebP, or AVIF, under 5MB each)`;
  }

  const amenities = formData
    .getAll("amenities")
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (amenities.length === 0) fieldErrors.amenities = "Add at least one amenity";

  if (!parsed.success || !mainImage || Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return { success: true, data: parsed.data, mainImage, gallery, amenities };
}

export type GalleryOrderRef = { kind: "existing"; id: string } | { kind: "new"; index: number };

export type ParseUpdateRoomFormDataResult =
  | {
      success: true;
      data: CreateRoomInput;
      amenities: string[];
      mainImage: { kind: "new"; file: File } | { kind: "existing"; id: string };
      galleryOrder: GalleryOrderRef[];
      galleryNewFiles: File[];
    }
  | { success: false; fieldErrors: CreateRoomFieldErrors };

// Edit form equivalent of parseCreateRoomFormData. Images are trickier here
// since the gallery is a reordered mix of images that already exist in
// room_images and freshly-picked files: galleryOrder is a JSON array of
// "existing:<id>" / "new:<index>" refs describing the final order, and the
// "new" refs are resolved against galleryNewFile entries by index. Main
// image is either a replacement file or the id of the kept existing image.
export function parseUpdateRoomFormData(formData: FormData): ParseUpdateRoomFormDataResult {
  const record: Record<string, unknown> = {};
  for (const key of CREATE_ROOM_TEXT_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string" && value !== "") record[key] = value;
  }

  const parsed = createRoomSchema.safeParse(record);
  const fieldErrors: CreateRoomFieldErrors = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreateRoomFieldErrors | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  const mainImageEntry = formData.get("mainImage");
  const mainImageId = formData.get("mainImageId");
  let mainImage: { kind: "new"; file: File } | { kind: "existing"; id: string } | null = null;

  if (mainImageEntry instanceof File && mainImageEntry.size > 0) {
    if (isValidRoomImage(mainImageEntry)) {
      mainImage = { kind: "new", file: mainImageEntry };
    } else {
      fieldErrors.mainImage = "Image must be JPEG, PNG, WebP, or AVIF and under 5MB";
    }
  } else if (typeof mainImageId === "string" && mainImageId) {
    mainImage = { kind: "existing", id: mainImageId };
  }

  if (!mainImage && !fieldErrors.mainImage) {
    fieldErrors.mainImage = "Main image is required";
  }

  const galleryOrderRaw = formData.get("galleryOrder");
  const galleryNewFiles = formData
    .getAll("galleryNewFile")
    .filter((entry): entry is File => entry instanceof File && isValidRoomImage(entry));

  let galleryOrder: GalleryOrderRef[] = [];
  if (typeof galleryOrderRaw === "string") {
    try {
      const refs = JSON.parse(galleryOrderRaw) as string[];
      galleryOrder = refs.map((ref) => {
        if (ref.startsWith("existing:")) return { kind: "existing", id: ref.slice("existing:".length) };
        if (ref.startsWith("new:")) return { kind: "new", index: Number(ref.slice("new:".length)) };
        throw new Error(`invalid gallery order ref: ${ref}`);
      });
    } catch {
      galleryOrder = [];
    }
  }

  if (galleryOrder.length < MIN_GALLERY_IMAGES) {
    fieldErrors.gallery = `Upload at least ${MIN_GALLERY_IMAGES} gallery images (JPEG, PNG, WebP, or AVIF, under 5MB each)`;
  }

  const amenities = formData
    .getAll("amenities")
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (amenities.length === 0) fieldErrors.amenities = "Add at least one amenity";

  if (!parsed.success || !mainImage || Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return { success: true, data: parsed.data, amenities, mainImage, galleryOrder, galleryNewFiles };
}
