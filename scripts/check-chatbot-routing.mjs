import assert from "node:assert/strict";
import { analyzeLocally, findHandoffReason, isVerifiedFaqAnalysis, resolveChatbotAnalysis } from "../src/server/services/chatbot-intent.service.ts";
import { buildUnknownChatbotMessage } from "../src/lib/chatbot-fallback.ts";
import { getBangkokDate, normalizeChatbotSearchState, validateChatbotDateRange } from "../src/lib/chatbot-date-validation.ts";

const idleSearch = { checkIn: null, checkOut: null, guests: null, budget: null, phase: "idle" };
const collectingSearch = { ...idleSearch, phase: "collecting" };

assert.equal(analyzeLocally("นำสัตว์เลี้ยงเข้าพักได้มั้ย", idleSearch).intent, "unknown");
assert.equal(analyzeLocally("โรงแรมดีไหม", idleSearch).intent, "unknown");
assert.deepEqual(
  { intent: analyzeLocally("มี Wi-Fi ไหม", idleSearch).intent, topic: analyzeLocally("มี Wi-Fi ไหม", idleSearch).faqTopic },
  { intent: "faq", topic: "facilities" },
);
assert.equal(analyzeLocally("หาห้องวันที่ 10/09/2026 ถึง 12/09/2026 สำหรับ 2 คน", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("I would like to ask about room availability", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("Are there any rooms available?", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("How can I book the room", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("How do I reserve a room?", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("I want to make a reservation", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("Can you look for an available room?", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("What is my booking number?", idleSearch).intent, "unknown");
assert.equal(analyzeLocally("2 guests", idleSearch).intent, "unknown");
assert.equal(analyzeLocally("10/09/2026", idleSearch).intent, "unknown");
assert.equal(analyzeLocally("10/09/2026 - 12/09/2026", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("2 guests, budget 4000", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("2 guests", collectingSearch).intent, "search_room");
assert.equal(analyzeLocally("Does the hotel have Wi-Fi for 2 guests?", idleSearch).intent, "faq");
assert.equal(analyzeLocally("Find a room with Wi-Fi", idleSearch).intent, "search_room");
assert.equal(analyzeLocally("เข้าพักได้ไหม", idleSearch).intent, "unknown");
assert.deepEqual(
  analyzeLocally("12/09/2026", { ...collectingSearch, checkIn: "2026-09-10" }),
  { intent: "search_room", faqTopic: "other", confidence: 1, checkIn: "2026-09-10", checkOut: "2026-09-12", guests: null, budget: null },
);
assert.equal(findHandoffReason("ขอคุยกับเจ้าหน้าที่", []), "explicit_agent_request");
assert.equal(findHandoffReason("can I chat with your agent", []), "explicit_agent_request");
assert.equal(findHandoffReason("Could I speak with a representative?", []), "explicit_agent_request");
assert.equal(findHandoffReason("Please connect me to the receptionist", []), "explicit_agent_request");
assert.equal(findHandoffReason("What can your agent do?", []), null);
assert.equal(findHandoffReason("ขอคืนเงินได้ไหม", []), null);
assert.equal(findHandoffReason("ถามซ้ำ", [{ role: "user", content: "ถามซ้ำ" }]), null);

const emptyAnalysis = { faqTopic: "other", checkIn: null, checkOut: null, guests: null, budget: null };
assert.deepEqual(
  resolveChatbotAnalysis(
    { ...emptyAnalysis, intent: "unknown", confidence: 0 },
    { ...emptyAnalysis, intent: "search_room", confidence: 0.95 },
    true,
  ),
  { analysis: { ...emptyAnalysis, intent: "search_room", confidence: 0.95 }, isSearchVerified: true },
);
assert.deepEqual(
  resolveChatbotAnalysis(
    {
      ...emptyAnalysis,
      intent: "search_room",
      confidence: 0.98,
      checkIn: "2026-09-11",
      checkOut: "2026-09-13",
      guests: 4,
      budget: 6000,
    },
    {
      ...emptyAnalysis,
      intent: "search_room",
      confidence: 0.95,
      checkIn: "2026-09-10",
      guests: 2,
    },
    true,
  ),
  {
    analysis: {
      ...emptyAnalysis,
      intent: "search_room",
      confidence: 0.98,
      checkIn: "2026-09-10",
      checkOut: "2026-09-13",
      guests: 2,
      budget: 6000,
    },
    isSearchVerified: true,
  },
);
assert.equal(
  resolveChatbotAnalysis(
    { ...emptyAnalysis, intent: "search_room", confidence: 0.95 },
    { ...emptyAnalysis, intent: "unknown", confidence: 0 },
    true,
  ).isSearchVerified,
  true,
);
assert.equal(
  resolveChatbotAnalysis(
    { ...emptyAnalysis, intent: "search_room", confidence: 0.85 },
    { ...emptyAnalysis, intent: "unknown", confidence: 0 },
    true,
  ).isSearchVerified,
  false,
);
assert.equal(
  isVerifiedFaqAnalysis(
    { ...emptyAnalysis, intent: "faq", faqTopic: "check_in", confidence: 0.95 },
    { ...emptyAnalysis, intent: "unknown", confidence: 0 },
    true,
  ),
  true,
);
assert.equal(
  isVerifiedFaqAnalysis(
    { ...emptyAnalysis, intent: "faq", faqTopic: "check_in", confidence: 0.85 },
    { ...emptyAnalysis, intent: "unknown", confidence: 0 },
    true,
  ),
  false,
);
assert.equal(
  isVerifiedFaqAnalysis(
    { ...emptyAnalysis, intent: "faq", faqTopic: "facilities", confidence: 0.8 },
    { ...emptyAnalysis, intent: "faq", faqTopic: "facilities", confidence: 0.95 },
    true,
  ),
  true,
);

assert.equal(
  buildUnknownChatbotMessage("ขออภัยค่ะ"),
  "ขออภัยค่ะ",
);

const validationNow = new Date("2026-08-31T05:00:00.000Z");
assert.equal(getBangkokDate(new Date("2026-08-30T18:00:00.000Z")), "2026-08-31");
assert.deepEqual(validateChatbotDateRange({ checkIn: null, checkOut: null }, validationNow), { valid: true, error: null });
assert.deepEqual(validateChatbotDateRange({ checkIn: "2026-09-10", checkOut: "2026-09-12" }, validationNow), { valid: true, error: null });
assert.deepEqual(validateChatbotDateRange({ checkIn: "2026-02-30", checkOut: "2026-09-12" }, validationNow), { valid: false, error: "invalid_check_in" });
assert.deepEqual(validateChatbotDateRange({ checkIn: "2026-09-10", checkOut: "2026-09-31" }, validationNow), { valid: false, error: "invalid_check_out" });
assert.deepEqual(validateChatbotDateRange({ checkIn: "2026-08-30", checkOut: "2026-09-02" }, validationNow), { valid: false, error: "check_in_in_past" });
assert.deepEqual(validateChatbotDateRange({ checkIn: null, checkOut: "2026-08-30" }, validationNow), { valid: false, error: "check_out_in_past" });
assert.deepEqual(validateChatbotDateRange({ checkIn: "2026-09-10", checkOut: "2026-09-10" }, validationNow), { valid: false, error: "check_out_not_after_check_in" });
assert.deepEqual(validateChatbotDateRange({ checkIn: "2028-02-28", checkOut: "2028-02-29" }, validationNow), { valid: true, error: null });
assert.deepEqual(
  normalizeChatbotSearchState({ checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2, budget: 4000, phase: "results" }),
  { checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2, budget: 4000, phase: "results" },
);
assert.deepEqual(
  normalizeChatbotSearchState({ checkIn: "2026-02-30", checkOut: "2026-9-12", guests: 1.5, budget: Number.POSITIVE_INFINITY, phase: "invalid" }),
  { checkIn: null, checkOut: null, guests: null, budget: null, phase: "idle" },
);
assert.deepEqual(
  normalizeChatbotSearchState({ checkIn: null, checkOut: null, guests: 21, budget: 4000, phase: "collecting" }),
  { checkIn: null, checkOut: null, guests: null, budget: 4000, phase: "collecting" },
);

console.log("Chatbot routing checks passed");
