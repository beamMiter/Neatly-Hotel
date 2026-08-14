// ── ChatbotButton ─────────────────────────────────────────────────────
// Floating chatbot launcher — fixed bottom-right, stays in place while scrolling (ทุกหน้า)
// แก้ไขได้: ตำแหน่ง (bottom-6 right-6), ขนาด — ยังไม่มี onClick/chat window logic

import Image from 'next/image';

const ChatbotButton = () => {
	return (
		<button type="button" className="fixed right-6 bottom-6 z-50 h-20 w-20" aria-label="Open chat">
			<Image src="/images/icon/chatbot.png" alt="" fill className="object-contain" />
		</button>
	);
};

export default ChatbotButton;
