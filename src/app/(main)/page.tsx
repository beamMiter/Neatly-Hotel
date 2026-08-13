import ChatWidget from "@/app/components/chat-widget";
import { createClient } from "@/app/lib/supabase/server";
import About from "@/components/shared/About";
import CustomerReview from "@/components/shared/CustomerReview";
import Hero from "@/components/shared/Hero";
import RoomsPreview from "@/components/shared/RoomsPreview";
import Services from "@/components/shared/Services";

export default async function Home() {
  const supabase = await createClient();
  const { data: chatbotSettings } = await supabase
    .from("chatbot_settings")
    .select("greeting_message")
    .eq("id", true)
    .maybeSingle();

  return (
    <main className="flex-1">
      <Hero />
      <About />
      <Services />
      <RoomsPreview />
      <CustomerReview />
      <ChatWidget greetingMessage={chatbotSettings?.greeting_message} />
    </main>
  );
}
