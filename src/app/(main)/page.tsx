import type { Metadata } from "next";
import About from "@/components/shared/About";
import CustomerReview from "@/components/shared/CustomerReview";
import Hero from "@/components/shared/Hero";
import RoomsPreview from "@/components/shared/RoomsPreview";
import Services from "@/components/shared/Services";
import { loadHotelInformation } from "@/server/queries/hotel.query";

export async function generateMetadata(): Promise<Metadata> {
  const hotel = await loadHotelInformation();

  return {
    title: hotel.name,
    description: hotel.description.slice(0, 160),
  };
}

export default async function Home() {
  const hotel = await loadHotelInformation();

  return (
    <main className="flex-1">
      <Hero />
      <About name={hotel.name} description={hotel.description} />
      <Services />
      <RoomsPreview />
      <CustomerReview />
    </main>
  );
}
