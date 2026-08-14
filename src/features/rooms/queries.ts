import "server-only";
import { createSupabaseServerClient } from "@/server/db/supabase-server";
import type { Room } from "./types";
import type { CreateRoomInput } from "./validations";

export const ROOMS_PAGE_SIZE = 6;

type GetRoomsParams = {
  query?: string;
  page?: number;
};

type GetRoomsResult = {
  rooms: Room[];
  totalCount: number;
  totalPages: number;
};

export async function getRooms({ query, page = 1 }: GetRoomsParams): Promise<GetRoomsResult> {
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * ROOMS_PAGE_SIZE;
  const to = from + ROOMS_PAGE_SIZE - 1;

  let request = supabase
    .from("room_types")
    .select("id, room_type, price, promotion_price, guests, bed_type, room_size_sqm, main_image_url", {
      count: "exact",
    })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (query) {
    request = request.ilike("room_type", `%${query}%`);
  }

  const { data, count, error } = await request;

  if (error) {
    console.error("[rooms] failed to fetch rooms:", error);
    return { rooms: [], totalCount: 0, totalPages: 1 };
  }

  const rooms: Room[] = (data ?? []).map((row) => ({
    id: row.id,
    roomType: row.room_type,
    price: Number(row.price),
    promotionPrice: row.promotion_price === null ? null : Number(row.promotion_price),
    guests: row.guests,
    bedType: row.bed_type,
    roomSizeSqm: row.room_size_sqm,
    imageUrl: row.main_image_url,
  }));

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ROOMS_PAGE_SIZE));

  return { rooms, totalCount, totalPages };
}

type CreateRoomTypeParams = {
  data: CreateRoomInput;
  mainImage: File;
  gallery: File[];
  amenities: string[];
};

type CreateRoomTypeResult = { success: true; id: string } | { success: false; message: string };

function extensionOf(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop() : "jpg";
}

export async function createRoomType({
  data,
  mainImage,
  gallery,
  amenities,
}: CreateRoomTypeParams): Promise<CreateRoomTypeResult> {
  const supabase = await createSupabaseServerClient();
  const id = crypto.randomUUID();

  const mainImagePath = `${id}/main.${extensionOf(mainImage)}`;
  const { error: mainUploadError } = await supabase.storage
    .from("room-images")
    .upload(mainImagePath, mainImage, { contentType: mainImage.type });

  if (mainUploadError) {
    console.error("[room_types] main image upload failed:", mainUploadError);
    return { success: false, message: "Failed to upload the main image" };
  }

  const mainImageUrl = supabase.storage.from("room-images").getPublicUrl(mainImagePath).data.publicUrl;

  const galleryImageUrls: string[] = [];
  for (const [index, file] of gallery.entries()) {
    const path = `${id}/gallery-${index}.${extensionOf(file)}`;
    const { error } = await supabase.storage.from("room-images").upload(path, file, { contentType: file.type });

    if (error) {
      console.error("[room_types] gallery image upload failed:", error);
      continue;
    }
    galleryImageUrls.push(supabase.storage.from("room-images").getPublicUrl(path).data.publicUrl);
  }

  const { error: insertError } = await supabase.from("room_types").insert({
    id,
    room_type: data.roomType,
    description: data.description,
    price: data.price,
    promotion_price: data.promotionPrice ?? null,
    guests: data.guests,
    bed_type: data.bedType,
    room_size_sqm: data.roomSizeSqm,
    main_image_url: mainImageUrl,
    gallery_image_urls: galleryImageUrls,
    amenities,
  });

  if (insertError) {
    console.error("[room_types] insert failed:", insertError);
    return { success: false, message: "Failed to save the room" };
  }

  return { success: true, id };
}
