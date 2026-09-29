import type { Metadata } from "next";
import { HotelInformationView } from "@/features/hotel-information/components/hotel-information-view";
import { loadHotelInformation } from "@/server/queries/hotel.query";

export const metadata: Metadata = {
  title: "Hotel Information | NEATLY Admin",
  description: "Edit hotel name, description, and logo",
};

export const dynamic = "force-dynamic";

export default async function HotelInformationPage() {
  const hotel = await loadHotelInformation();
  return <HotelInformationView hotel={hotel} />;
}
