// ── MainLayout ────────────────────────────────────────────────────────
// Wraps the public marketing/booking pages (landing, search, room detail) — Navbar, Footer, chat widget
// แก้ไขได้: อยู่แค่หน้าในกลุ่มนี้ — auth pages (login/register/forgot-password) ไม่ใช้ layout นี้

import { Suspense } from 'react';
import ChatWidget from '@/features/chatbot/components/chat-widget';
import { createClient } from '@/server/db/supabase-server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { loadHotelInformation } from '@/server/queries/hotel.query';
import { getAccountSummary } from '@/server/queries/profiles.query';
import { isStaff } from '@/server/queries/staff-members.query';

const ChatWidgetWithSettings = async () => {
	const supabase = await createClient();
	const [{ data: chatbotSettings }, { data: suggestions }] = await Promise.all([
		supabase.from('chatbot_settings').select('*').eq('id', true).maybeSingle(),
		supabase.from('chatbot_suggestions').select('*').eq('is_active', true).order('sort_order'),
	]);

	return <ChatWidget greetingMessage={chatbotSettings?.greeting_message} greetingMessages={{ th: chatbotSettings?.greeting_message_th, en: chatbotSettings?.greeting_message_en }} suggestions={suggestions ?? []} />;
};

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
	const supabase = await createClient();
	const [hotel, { data: { user } }] = await Promise.all([loadHotelInformation(), supabase.auth.getUser()]);
	const [account, isAdmin] = user
		? await Promise.all([getAccountSummary(user.id, user.email ?? ''), isStaff(user.id)])
		: [null, false];

	return (
		<>
			<Navbar logoUrl={hotel.logoUrl} hotelName={hotel.name} account={account} isAdmin={isAdmin} />
			{/* flex flex-1 flex-col (div ธรรมดา ไม่ใช่ <main>): sticky footer — ตัวมันเองต้อง flex-1
			    เพื่อกินพื้นที่ที่เหลือของ body (flex-col, min-h-full ใน root layout) และต้องเป็น
			    flex container (flex-col) ด้วย เพราะบางหน้าใน children (เช่น landing, room detail) มี
			    <main className="flex-1"> ของตัวเองอยู่แล้ว ซึ่งต้องมี flex parent ถึงจะทำงาน — ถ้า div
			    นี้เป็นแค่ block ธรรมดา main ข้างในจะไม่ยืดตาม หน้าที่ไม่มี flex-1 ของตัวเอง (เช่น
			    /profile ตอนไม่มี profile ให้แก้) ก็ยังต้องเติม flex-1 เองที่ root element เพื่อให้พื้น
			    หลังของหน้านั้นยืดเต็มแทนที่จะเผย default bg ของ body ให้เห็นเป็นช่องว่าง
			    ใช้ div ไม่ใช่ <main> เพราะจะกลายเป็น landmark ซ้ำกับ <main> ที่บางหน้ามีอยู่แล้ว */}
			<div className="flex flex-1 flex-col">{children}</div>
			<Footer logoUrl={hotel.logoUrl} hotelName={hotel.name} />
			<Suspense fallback={null}>
				<ChatWidgetWithSettings />
			</Suspense>
		</>
	);
};

export default MainLayout;
