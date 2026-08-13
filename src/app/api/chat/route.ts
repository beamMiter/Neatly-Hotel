import OpenAI from "openai";
import { createClient } from "@/app/lib/supabase/server";
import type { ChatbotFaq } from "@/app/lib/chatbot-faq";
import {
  emptySearchState,
  getMissingSearchFields,
  isValidDateRange,
  mergeSearchState,
  searchAvailableRooms,
  type SearchState,
} from "@/app/lib/hotel";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Intent = "faq" | "search_room" | "unknown";
type FaqTopic = "check_in" | "facilities" | "location" | "contact" | "other";

type Analysis = {
  intent: Intent;
  faqTopic: FaqTopic;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  budget: number | null;
};

const intentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: ["faq", "search_room", "unknown"] },
    faqTopic: {
      type: "string",
      enum: ["check_in", "facilities", "location", "contact", "other"],
    },
    checkIn: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    checkOut: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    guests: { type: ["integer", "null"], minimum: 1, maximum: 20 },
    budget: { type: ["number", "null"], minimum: 1 },
  },
  required: ["intent", "faqTopic", "checkIn", "checkOut", "guests", "budget"],
} as const;

const faqAnswers: Record<FaqTopic, string> = {
  check_in: "เวลาเช็กอินมาตรฐานคือ 14:00 น. และเช็กเอาต์ภายใน 12:00 น. หากต้องการเข้าพักก่อนเวลา กรุณาแจ้งล่วงหน้าเพื่อให้เจ้าหน้าที่ตรวจสอบค่ะ",
  facilities: "Neatly Hotel มี Wi‑Fi ฟรี ที่จอดรถ อาหารเช้า และบริการทำความสะอาดรายวันค่ะ หากต้องการสอบถามสิ่งอำนวยความสะดวกเฉพาะ แจ้งมาได้เลยนะคะ",
  location: "ข้อมูลแผนที่และที่อยู่จริงยังไม่ได้เชื่อมในระบบทดลองนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อยืนยันเส้นทางก่อนเดินทางค่ะ",
  contact: "ขณะนี้ช่องทางติดต่อจริงยังไม่ได้ตั้งค่าในระบบทดลอง กรุณาฝากชื่อและช่องทางติดต่อไว้เพื่อให้เจ้าหน้าที่ติดต่อกลับค่ะ",
  other: "ยินดีช่วยตอบข้อมูลทั่วไปเกี่ยวกับ Neatly Hotel ค่ะ คุณสามารถถามเรื่องเวลาเช็กอิน สิ่งอำนวยความสะดวก หรือค้นหาห้องพักได้เลย",
};

const fieldLabels: Record<keyof SearchState, string> = {
  checkIn: "วันเช็กอิน",
  checkOut: "วันเช็กเอาต์",
  guests: "จำนวนผู้เข้าพัก",
  budget: "งบประมาณต่อคืน",
};

async function getChatbotContent(): Promise<{ faqs: ChatbotFaq[]; autoReply: string | null }> {
  try {
    const supabase = await createClient();
    const [faqResult, settingsResult] = await Promise.all([
      supabase.from("chatbot_faqs").select("*").eq("is_active", true).order("sort_order").limit(100),
      supabase.from("chatbot_settings").select("auto_reply_message").eq("id", true).maybeSingle(),
    ]);

    return {
      faqs: faqResult.error ? [] : faqResult.data as ChatbotFaq[],
      autoReply: settingsResult.data?.auto_reply_message ?? null,
    };
  } catch {
    return { faqs: [], autoReply: null };
  }
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function findManagedFaq(message: string, faqs: ChatbotFaq[]) {
  const normalizedMessage = normalizeForMatch(message);
  if (!normalizedMessage) return null;

  const ranked = faqs.map((faq) => {
    const phrases = [...faq.keywords, faq.question].map(normalizeForMatch).filter(Boolean);
    const score = phrases.reduce((total, phrase) => {
      if (normalizedMessage.includes(phrase)) return total + 10 + phrase.length;
      const matchingWords = phrase.split(" ").filter((word) => word.length > 1 && normalizedMessage.includes(word));
      return total + matchingWords.length;
    }, 0);
    return { faq, score };
  }).sort((a, b) => b.score - a.score || a.faq.sort_order - b.faq.sort_order);

  return ranked[0]?.score >= 2 ? ranked[0].faq : null;
}

function normalizeSearchState(value: unknown): SearchState {
  if (!value || typeof value !== "object") return emptySearchState;
  const state = value as Partial<SearchState>;
  return {
    checkIn: typeof state.checkIn === "string" ? state.checkIn : null,
    checkOut: typeof state.checkOut === "string" ? state.checkOut : null,
    guests: typeof state.guests === "number" && state.guests > 0 ? state.guests : null,
    budget: typeof state.budget === "number" && state.budget > 0 ? state.budget : null,
  };
}

function isoDate(value: string) {
  const slash = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const iso = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return iso?.[0] ?? null;
}

function analyzeLocally(message: string, hasSearchState: boolean): Analysis {
  const text = message.toLowerCase();
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const slashDates = text.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g) ?? [];
  const allDates = [...dates, ...slashDates].map(isoDate).filter(Boolean) as string[];
  const guestMatch = text.match(/(\d+)\s*(คน|ท่าน|guest)/);
  const budgetMatch = text.match(/(?:งบ|ไม่เกิน|budget)\s*(?:ประมาณ)?\s*([\d,]+)/);
  const searchWords = ["หาห้อง", "ค้นหาห้อง", "ห้องว่าง", "จอง", "เข้าพัก", "งบ", "พักวันที่"];
  let faqTopic: FaqTopic = "other";
  if (text.includes("เช็กอิน") || text.includes("check-in")) faqTopic = "check_in";
  else if (["wifi", "อาหารเช้า", "ที่จอดรถ", "สิ่งอำนวย"].some((word) => text.includes(word))) faqTopic = "facilities";
  else if (["ที่อยู่", "แผนที่", "เดินทาง"].some((word) => text.includes(word))) faqTopic = "location";
  else if (["ติดต่อ", "โทร", "เบอร์"].some((word) => text.includes(word))) faqTopic = "contact";

  const suppliesSearchData = allDates.length > 0 || Boolean(guestMatch) || Boolean(budgetMatch);
  const isSearch =
    searchWords.some((word) => text.includes(word)) ||
    suppliesSearchData ||
    (hasSearchState && faqTopic === "other");
  const isFaq = faqTopic !== "other" || ["โรงแรม", "บริการ"].some((word) => text.includes(word));

  return {
    intent: isSearch ? "search_room" : isFaq ? "faq" : "unknown",
    faqTopic,
    checkIn: allDates[0] ?? null,
    checkOut: allDates[1] ?? null,
    guests: guestMatch ? Number(guestMatch[1]) : null,
    budget: budgetMatch ? Number(budgetMatch[1].replaceAll(",", "")) : null,
  };
}

async function analyzeWithOpenAI(messages: Message[], state: SearchState): Promise<Analysis> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const today = new Date().toISOString().slice(0, 10);
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    instructions: `จำแนก intent และดึงข้อมูลค้นหาห้องจากบทสนทนาโรงแรม
วันนี้คือ ${today} แปลงวันที่เป็น YYYY-MM-DD
intent มี faq, search_room, unknown เท่านั้น
ถ้ากำลังเก็บข้อมูลค้นหาห้องอยู่ ให้คง intent เป็น search_room แม้ข้อความล่าสุดเป็นเพียงวันที่หรือตัวเลข
faqTopic ใช้ check_in, facilities, location, contact หรือ other
คืนเฉพาะข้อมูลที่ผู้ใช้ระบุจริง ห้ามเดาห้อง ราคา หรือจำนวนผู้เข้าพัก
search state ปัจจุบัน: ${JSON.stringify(state)}`,
    input: messages,
    text: {
      format: {
        type: "json_schema",
        name: "hotel_intent",
        strict: true,
        schema: intentSchema,
      },
    },
    max_output_tokens: 250,
  });

  return JSON.parse(response.output_text) as Analysis;
}

function searchResponse(analysis: Analysis, current: SearchState) {
  const search = mergeSearchState(current, {
    checkIn: analysis.checkIn,
    checkOut: analysis.checkOut,
    guests: analysis.guests,
    budget: analysis.budget,
  });

  if (!isValidDateRange(search)) {
    return {
      intent: "search_room" as const,
      message: "วันเช็กเอาต์ต้องอยู่หลังวันเช็กอินค่ะ กรุณาระบุวันที่ใหม่อีกครั้ง",
      search: { ...search, checkIn: null, checkOut: null },
      rooms: [],
    };
  }

  const missing = getMissingSearchFields(search);
  if (missing.length > 0) {
    const labels = missing.map((field) => fieldLabels[field]);
    return {
      intent: "search_room" as const,
      message: `ได้เลยค่ะ เพื่อค้นหาห้องที่เหมาะสม ขอข้อมูลเพิ่ม: ${labels.join(", ")}\nตัวอย่าง: 10/09/2026 - 12/09/2026, 2 คน, งบ 4,000 บาทต่อคืน`,
      search,
      rooms: [],
    };
  }

  const rooms = searchAvailableRooms(search);
  return {
    intent: "search_room" as const,
    message: rooms.length
      ? `พบห้องว่าง ${rooms.length} แบบ สำหรับ ${search.guests} ท่าน งบไม่เกิน ${search.budget?.toLocaleString("th-TH")} บาทต่อคืนค่ะ`
      : "ไม่พบห้องที่รองรับจำนวนผู้เข้าพักภายในงบประมาณนี้ ลองเพิ่มงบประมาณหรือปรับจำนวนผู้เข้าพักได้ค่ะ",
    search,
    rooms,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: Message[]; search?: unknown };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const validMessages = messages.filter(
      (message): message is Message =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0 &&
        message.content.length <= 800,
    );
    const lastMessage = validMessages.at(-1);
    if (!lastMessage || lastMessage.role !== "user") {
      return Response.json({ error: "กรุณาส่งข้อความที่ถูกต้อง" }, { status: 400 });
    }

    const chatbotContent = await getChatbotContent();
    const managedFaq = findManagedFaq(lastMessage.content, chatbotContent.faqs);
    if (managedFaq) {
      return Response.json({
        intent: "faq",
        message: managedFaq.answer,
        faqId: managedFaq.id,
        search: emptySearchState,
        rooms: [],
        mode: "managed_faq",
      });
    }

    const currentSearch = normalizeSearchState(body.search);
    const hasStoredSearchState = Object.values(currentSearch).some(Boolean);
    const hasSearchHistory = validMessages.slice(0, -1).some((message) =>
      ["ค้นหาห้อง", "หาห้อง", "ห้องว่าง", "จอง", "ข้อมูลเพิ่ม"].some((word) =>
        message.content.toLowerCase().includes(word),
      ),
    );
    const analysis = process.env.OPENAI_API_KEY
      ? await analyzeWithOpenAI(validMessages, currentSearch)
      : analyzeLocally(lastMessage.content, hasStoredSearchState || hasSearchHistory);

    if (analysis.intent === "search_room") {
      return Response.json({ ...searchResponse(analysis, currentSearch), mode: process.env.OPENAI_API_KEY ? "openai" : "demo" });
    }
    if (analysis.intent === "faq") {
      return Response.json({
        intent: "faq",
        message: faqAnswers[analysis.faqTopic],
        search: emptySearchState,
        rooms: [],
        mode: process.env.OPENAI_API_KEY ? "openai" : "demo",
      });
    }

    return Response.json({
      intent: "unknown",
      message: chatbotContent.autoReply ?? "ขออภัยค่ะ ฉันยังไม่เข้าใจคำถาม รบกวนอธิบายเพิ่มเติม หรือเลือกถามเรื่องห้องพัก ราคา เวลาเช็กอิน และสิ่งอำนวยความสะดวกได้ค่ะ",
      search: currentSearch,
      rooms: [],
      mode: process.env.OPENAI_API_KEY ? "openai" : "demo",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "ระบบแชตขัดข้องชั่วคราว กรุณาลองใหม่" }, { status: 500 });
  }
}
