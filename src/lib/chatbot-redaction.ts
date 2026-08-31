const MAX_REDACTED_CHAT_MESSAGE_CHARS = 450;

export function redactChatbotMessage(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)/g, "[REDACTED_PHONE]")
    .replace(/\b(?:booking\s*(?:code|no\.?|number)?\s*[:#-]?\s*[a-z0-9_-]{4,}|(?:bk|res|book)[-_]?[a-z0-9]{4,})\b/gi, "[REDACTED_BOOKING_CODE]")
    .slice(0, MAX_REDACTED_CHAT_MESSAGE_CHARS);
}
