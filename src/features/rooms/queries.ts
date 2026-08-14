import "server-only";
import { createSupabaseServerClient } from "@/server/db/supabase-server";
import type { Room } from "./types";

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
