// ── MainLayout ────────────────────────────────────────────────────────
// Wraps the public marketing/booking pages (landing, search, room detail) — Navbar, Footer, chat widget
// แก้ไขได้: อยู่แค่หน้าในกลุ่มนี้ — auth pages (login/register/forgot-password) ไม่ใช้ layout นี้

import { Suspense } from 'react';
import ChatWidget from '@/features/chatbot/components/chat-widget';
import { createClient } from '@/server/db/supabase-server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { loadHotelInformation } from '@/server/queries/hotel.query';

const ChatWidgetWithSettings = async () => {
	const supabase = await createClient();
	const [{ data: chatbotSettings }, { data: suggestions }] = await Promise.all([
		supabase.from('chatbot_settings').select('greeting_message').eq('id', true).maybeSingle(),
		supabase.from('chatbot_suggestions').select('*').eq('is_active', true).order('sort_order'),
	]);

	return <ChatWidget greetingMessage={chatbotSettings?.greeting_message} suggestions={suggestions ?? []} />;
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
