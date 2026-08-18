import About from "@/components/shared/About";
import CustomerReview from "@/components/shared/CustomerReview";
import Hero from "@/components/shared/Hero";
import RoomsPreview from "@/components/shared/RoomsPreview";
import Services from "@/components/shared/Services";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <About />
      <Services />
      <RoomsPreview />
      <CustomerReview />
    </main>
  );
}
