import type { ChatbotFaq } from "@/types/chatbot";
import { normalizeIntentText } from "@/server/services/chatbot-intent.service";

export const faqAnswers = {
  check_in: "เวลาเช็กอินมาตรฐานคือ 14:00 น. และเช็กเอาต์ภายใน 12:00 น.",
  facilities: "Neatly Hotel มี Wi-Fi ที่จอดรถ อาหารเช้า และบริการทำความสะอาดรายวันค่ะ",
  location: "กรุณาติดต่อเจ้าหน้าที่เพื่อยืนยันแผนที่และเส้นทางล่าสุดค่ะ",
  contact: "กรุณาฝากชื่อและช่องทางติดต่อไว้ เจ้าหน้าที่จะติดต่อกลับค่ะ",
  other: "ยินดีช่วยตอบข้อมูลทั่วไปเกี่ยวกับ Neatly Hotel ค่ะ",
} as const;

export function findManagedFaq(message: string, faqs: ChatbotFaq[]) {
  const normalizedMessage = normalizeIntentText(message);
  if (!normalizedMessage) return null;
  const ranked = faqs.map((faq) => {
    const phrases = [...faq.keywords, faq.question].map(normalizeIntentText).filter(Boolean);
    const score = phrases.reduce((total, phrase) => total + (normalizedMessage.includes(phrase) ? 10 + phrase.length : phrase.split(" ").filter((word) => word.length > 1 && normalizedMessage.includes(word)).length), 0);
    return { faq, score };
  }).sort((a, b) => b.score - a.score || a.faq.sort_order - b.faq.sort_order);
  return ranked[0]?.score >= 2 ? ranked[0].faq : null;
}
