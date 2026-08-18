// ── ChatbotButton ─────────────────────────────────────────────────────
// Floating chatbot launcher — fixed bottom-right, stays in place while scrolling (ทุกหน้า)
// แก้ไขได้: ตำแหน่ง (bottom-6 right-6), ขนาด — ยังไม่มี onClick/chat window logic

import Image from 'next/image';

const ChatbotButton = () => {
	return (
		<button
			type="button"
			className="fixed right-6 bottom-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F3] p-2 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] lg:h-20 lg:w-20 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
			aria-label="Open chat"
		>
			<Image src="/images/icon/chatbot.png" alt="" fill className="object-contain" />
		</button>
	);
};

export default ChatbotButton;
