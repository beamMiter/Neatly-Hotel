// ── MainLayout ────────────────────────────────────────────────────────
// Wraps the public marketing/booking pages (landing, search, room detail) — Navbar, Footer, ChatbotButton
// แก้ไขได้: อยู่แค่หน้าในกลุ่มนี้ — auth pages (login/register/forgot-password) ไม่ใช้ layout นี้

import { Suspense } from 'react';
import ChatWidget from '@/app/components/chat-widget';
import { createClient } from '@/app/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { loadHotelInformation } from '@/server/queries/hotel.query';

const ChatWidgetWithSettings = async () => {
	const supabase = await createClient();
	const { data: chatbotSettings } = await supabase
		.from('chatbot_settings')
		.select('greeting_message')
		.eq('id', true)
		.maybeSingle();

	return <ChatWidget greetingMessage={chatbotSettings?.greeting_message} />;
};

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
	const hotel = await loadHotelInformation();

	return (
		<>
			<Navbar logoUrl={hotel.logoUrl} hotelName={hotel.name} />
			{children}
			<Footer logoUrl={hotel.logoUrl} hotelName={hotel.name} />
			<Suspense fallback={null}>
				<ChatWidgetWithSettings />
			</Suspense>
		</>
	);
};

export default MainLayout;
