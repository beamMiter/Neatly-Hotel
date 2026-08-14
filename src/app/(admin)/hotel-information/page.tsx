import type { Metadata } from "next";
import { HotelInformationView } from "@/features/hotel-information/components/hotel-information-view";
import { hasDatabaseUrl } from "@/server/db";
import { getHotelInformation } from "@/server/queries/hotel.query";
import { DEFAULT_HOTEL_INFORMATION } from "@/types/hotel";

export const metadata: Metadata = {
  title: "Hotel Information | NEATLY Admin",
  description: "Edit hotel name, description, and logo",
};

export const dynamic = "force-dynamic";

async function loadHotel() {
  if (!hasDatabaseUrl()) {
    return DEFAULT_HOTEL_INFORMATION;
  }

  try {
    return await getHotelInformation();
  } catch (error) {
    console.error("[hotel-information] Failed to load hotel:", error);
    return DEFAULT_HOTEL_INFORMATION;
  }
}

export default async function HotelInformationPage() {
  const hotel = await loadHotel();
  return <HotelInformationView hotel={hotel} />;
}
