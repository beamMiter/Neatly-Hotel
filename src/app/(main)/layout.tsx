// ── MainLayout ────────────────────────────────────────────────────────
// Wraps the public marketing/booking pages (landing, room detail) — Navbar, Footer, ChatbotButton
// แก้ไขได้: อยู่แค่หน้าในกลุ่มนี้ — auth pages (login/register/forgot-password) ไม่ใช้ layout นี้

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatbotButton from '@/components/ui/ChatbotButton';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<Navbar />
			{children}
			<Footer />
			<ChatbotButton />
		</>
	);
};

export default MainLayout;
