const FALLBACK_INTRO = "ขออภัยค่ะ ฉันยังไม่มีข้อมูลสำหรับคำถามนี้";

export function buildUnknownChatbotMessage(autoReply: string | null) {
  return autoReply?.trim() || FALLBACK_INTRO;
}
