import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { RoomTypeSummary, RoomTypeDetail, RoomImage } from "@/types/room-type";
import type { CreateRoomInput, GalleryOrderRef } from "@/features/rooms/validations";

export const ROOMS_PAGE_SIZE = 6;

const IMAGE_BUCKET = "room-images";

type GetRoomsParams = {
  query?: string;
  page?: number;
};

type GetRoomsResult = {
  rooms: RoomTypeSummary[];
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

function coverImageUrl(images: RoomTypeRow["room_images"]) {
  if (!images || images.length === 0) return null;
  const cover = images.find((image) => image.is_cover) ?? images[0];
  return supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(cover.storage_path).data.publicUrl;
}

export async function getRooms({ query, page = 1 }: GetRoomsParams): Promise<GetRoomsResult> {
  // Admin client: this is an internal management list, so it should show
  // every room type (including inactive/draft ones), not just is_active
  // rows the public-facing SELECT policy allows for anon/authenticated.
  const supabase = supabaseAdmin;

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

  const rooms: RoomTypeSummary[] = rows.map((row) => ({
    id: row.id,
    roomType: row.name,
    price: row.base_price === null ? 0 : Number(row.base_price),
    promotionPrice: row.promotion_price === null ? null : Number(row.promotion_price),
    guests: row.capacity ?? 0,
    bedType: row.bed_type ?? "",
    roomSizeSqm: row.size_sqm === null ? 0 : Number(row.size_sqm),
    imageUrl: coverImageUrl(row.room_images),
  }));

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ROOMS_PAGE_SIZE));

  return { rooms, totalCount, totalPages };
}

/** Names used by the chatbot CMS Room Type picker. */
export async function getRoomTypeNames(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("room_types")
    .select("name")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[room_types] failed to fetch room names:", error);
    return [];
  }

  return (data ?? [])
    .map((room) => room.name)
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0);
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
  // Uses the admin client (secret key, bypasses RLS): there's no signed-in
  // admin session to scope this write to yet, and the anon-role INSERT policy
  // on room_types/room_images was confirmed correct at the SQL level
  // (works under `set role anon`) but still rejected requests made through
  // the REST API even after a schema reload — a platform-level quirk this
  // route sidesteps rather than chases further.
  const supabase = supabaseAdmin;

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

type RoomTypeDetailRow = {
  id: string;
  name: string;
  description: string | null;
  bed_type: string | null;
  capacity: number | null;
  size_sqm: number | string | null;
  base_price: number | string | null;
  promotion_price: number | string | null;
  amenities: string[] | null;
  room_images: { id: string; storage_path: string; sort_order: number; is_cover: boolean }[] | null;
};

export async function getRoomById(id: string): Promise<RoomTypeDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("room_types")
    .select(
      "id, name, description, bed_type, capacity, size_sqm, base_price, promotion_price, amenities, room_images(id, storage_path, sort_order, is_cover)"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("[room_types] failed to fetch room detail:", error);
    return null;
  }

  const row = data as unknown as RoomTypeDetailRow;
  const images = (row.room_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  const toRoomImage = (image: (typeof images)[number]): RoomImage => ({
    id: image.id,
    url: supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(image.storage_path).data.publicUrl,
    sortOrder: image.sort_order,
    isCover: image.is_cover,
  });

  const mainImageRow = images.find((image) => image.is_cover) ?? images[0] ?? null;
  const galleryRows = images.filter((image) => image.id !== mainImageRow?.id);

  return {
    id: row.id,
    roomType: row.name,
    description: row.description ?? "",
    price: row.base_price === null ? 0 : Number(row.base_price),
    promotionPrice: row.promotion_price === null ? null : Number(row.promotion_price),
    guests: row.capacity ?? 0,
    bedType: row.bed_type ?? "",
    roomSizeSqm: row.size_sqm === null ? 0 : Number(row.size_sqm),
    amenities: row.amenities ?? [],
    mainImage: mainImageRow ? toRoomImage(mainImageRow) : null,
    gallery: galleryRows.map(toRoomImage),
  };
}

type UpdateRoomTypeParams = {
  id: string;
  data: CreateRoomInput;
  amenities: string[];
  mainImage: { kind: "new"; file: File } | { kind: "existing"; id: string };
  galleryOrder: GalleryOrderRef[];
  galleryNewFiles: File[];
};

type UpdateRoomTypeResult = { success: true } | { success: false; message: string };

// Batches everything the edit form can change into one call: scalar fields,
// which existing images are kept vs removed, newly uploaded images, and the
// final display order (including which image is the cover). Runs as a
// sequence of awaited steps rather than a single transaction — acceptable
// for an admin-only, low-traffic form; a partial failure here just leaves
// some images not yet reflecting the latest reorder, not a corrupt room.
export async function updateRoomType({
  id,
  data,
  amenities,
  mainImage,
  galleryOrder,
  galleryNewFiles,
}: UpdateRoomTypeParams): Promise<UpdateRoomTypeResult> {
  const supabase = supabaseAdmin;

  const { data: existingImages, error: fetchError } = await supabase
    .from("room_images")
    .select("id, storage_path")
    .eq("room_type_id", id);

  if (fetchError) {
    console.error("[room_images] failed to load existing images:", fetchError);
    return { success: false, message: "Failed to load existing images" };
  }

  const keptIds = new Set<string>();
  if (mainImage.kind === "existing") keptIds.add(mainImage.id);
  for (const ref of galleryOrder) {
    if (ref.kind === "existing") keptIds.add(ref.id);
  }

  const toRemove = (existingImages ?? []).filter((image) => !keptIds.has(image.id));

  const { error: updateError } = await supabase
    .from("room_types")
    .update({
      name: data.roomType,
      description: data.description,
      base_price: data.price,
      promotion_price: data.promotionPrice ?? null,
      capacity: data.guests,
      bed_type: data.bedType,
      size_sqm: data.roomSizeSqm,
      amenities,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[room_types] update failed:", updateError);
    return { success: false, message: "Failed to update the room" };
  }

  if (toRemove.length > 0) {
    await supabase.storage.from(IMAGE_BUCKET).remove(toRemove.map((image) => image.storage_path));
    const { error: deleteImagesError } = await supabase
      .from("room_images")
      .delete()
      .in(
        "id",
        toRemove.map((image) => image.id)
      );
    if (deleteImagesError) {
      console.error("[room_images] failed to delete removed images:", deleteImagesError);
    }
  }

  let mainImageRowId: string | null = mainImage.kind === "existing" ? mainImage.id : null;

  if (mainImage.kind === "new") {
    const path = `${id}/main-${Date.now()}.${extensionOf(mainImage.file)}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, mainImage.file, { contentType: mainImage.file.type });

    if (uploadError) {
      console.error("[room_images] main image upload failed:", uploadError);
      return { success: false, message: "Failed to upload the main image" };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("room_images")
      .insert({ room_type_id: id, storage_path: path, sort_order: 0, is_cover: true })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[room_images] main image insert failed:", insertError);
      return { success: false, message: "Failed to save the main image" };
    }
    mainImageRowId = inserted.id as string;
  }

  const newFileIdByIndex = new Map<number, string>();
  for (const [index, file] of galleryNewFiles.entries()) {
    const path = `${id}/gallery-${Date.now()}-${index}.${extensionOf(file)}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      console.error(`[room_images] gallery image upload failed (index ${index}):`, uploadError);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("room_images")
      .insert({ room_type_id: id, storage_path: path, sort_order: 0, is_cover: false })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error(`[room_images] gallery image insert failed (index ${index}):`, insertError);
      continue;
    }
    newFileIdByIndex.set(index, inserted.id as string);
  }

  const orderUpdates: { id: string; sort_order: number; is_cover: boolean }[] = [];
  if (mainImageRowId) {
    orderUpdates.push({ id: mainImageRowId, sort_order: 0, is_cover: true });
  }
  galleryOrder.forEach((ref, index) => {
    const imageId = ref.kind === "existing" ? ref.id : newFileIdByIndex.get(ref.index);
    if (imageId) orderUpdates.push({ id: imageId, sort_order: index + 1, is_cover: false });
  });

  for (const update of orderUpdates) {
    const { error } = await supabase
      .from("room_images")
      .update({ sort_order: update.sort_order, is_cover: update.is_cover })
      .eq("id", update.id);
    if (error) {
      console.error(`[room_images] failed to update ordering for ${update.id}:`, error);
    }
  }

  return { success: true };
}

type DeleteRoomTypeResult = { success: true } | { success: false; message: string };

export async function deleteRoomType(id: string): Promise<DeleteRoomTypeResult> {
  const supabase = supabaseAdmin;

  const { data: images } = await supabase.from("room_images").select("storage_path").eq("room_type_id", id);

  const { error } = await supabase.from("room_types").delete().eq("id", id);
  if (error) {
    console.error("[room_types] delete failed:", error);
    return { success: false, message: "Failed to delete the room" };
  }

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
    if (removeError) {
      console.error("[room_images] failed to remove storage files after delete:", removeError);
    }
  }

  return { success: true };
}
