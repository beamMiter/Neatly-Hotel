import "server-only";
import { createSupabaseServerClient } from "@/server/db/supabase-server";
import type { Room } from "./types";
import type { CreateRoomInput } from "./validations";

export const ROOMS_PAGE_SIZE = 6;

const IMAGE_BUCKET = "room-images";

type GetRoomsParams = {
  query?: string;
  page?: number;
};

type GetRoomsResult = {
  rooms: Room[];
  totalCount: number;
  totalPages: number;
};

type RoomTypeRow = {
  id: string;
  name: string;
  bed_type: string | null;
  capacity: number | null;
  size_sqm: number | string | null;
  base_price: number | string | null;
  promotion_price: number | string | null;
  room_images: { storage_path: string; is_cover: boolean }[] | null;
};

function coverImageUrl(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  images: RoomTypeRow["room_images"]
) {
  if (!images || images.length === 0) return null;
  const cover = images.find((image) => image.is_cover) ?? images[0];
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(cover.storage_path).data.publicUrl;
}

export async function getRooms({ query, page = 1 }: GetRoomsParams): Promise<GetRoomsResult> {
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * ROOMS_PAGE_SIZE;
  const to = from + ROOMS_PAGE_SIZE - 1;

  let request = supabase
    .from("room_types")
    .select("id, name, bed_type, capacity, size_sqm, base_price, promotion_price, room_images(storage_path, is_cover)", {
      count: "exact",
    })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (query) {
    request = request.ilike("name", `%${query}%`);
  }

  const { data, count, error } = await request;

  if (error) {
    console.error("[room_types] failed to fetch rooms:", error);
    return { rooms: [], totalCount: 0, totalPages: 1 };
  }

  const rows = (data ?? []) as unknown as RoomTypeRow[];

  const rooms: Room[] = rows.map((row) => ({
    id: row.id,
    roomType: row.name,
    price: row.base_price === null ? 0 : Number(row.base_price),
    promotionPrice: row.promotion_price === null ? null : Number(row.promotion_price),
    guests: row.capacity ?? 0,
    bedType: row.bed_type ?? "",
    roomSizeSqm: row.size_sqm === null ? 0 : Number(row.size_sqm),
    imageUrl: coverImageUrl(supabase, row.room_images),
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

  const { data: inserted, error: insertError } = await supabase
    .from("room_types")
    .insert({
      name: data.roomType,
      description: data.description,
      base_price: data.price,
      promotion_price: data.promotionPrice ?? null,
      capacity: data.guests,
      bed_type: data.bedType,
      size_sqm: data.roomSizeSqm,
      amenities,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[room_types] insert failed:", insertError);
    return { success: false, message: "Failed to save the room" };
  }

  const roomTypeId = inserted.id as string;
  const images = [mainImage, ...gallery];
  const imageRows: { room_type_id: string; storage_path: string; sort_order: number; is_cover: boolean }[] = [];

  for (const [index, file] of images.entries()) {
    const path = `${roomTypeId}/${index}.${extensionOf(file)}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      console.error(`[room_images] upload failed (index ${index}):`, uploadError);
      // The main image (index 0) is required; a failed gallery upload is skipped instead.
      if (index === 0) {
        return { success: false, message: "Failed to upload the main image" };
      }
      continue;
    }

    imageRows.push({ room_type_id: roomTypeId, storage_path: path, sort_order: index, is_cover: index === 0 });
  }

  if (imageRows.length > 0) {
    const { error: imagesError } = await supabase.from("room_images").insert(imageRows);
    if (imagesError) {
      console.error("[room_images] insert failed:", imagesError);
    }
  }

  return { success: true, id: roomTypeId };
}
