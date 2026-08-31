import assert from "node:assert/strict";
import { analyzeLocally, findHandoffReason, resolveChatbotAnalysis } from "../src/server/services/chatbot-intent.service.ts";
import { buildUnknownChatbotMessage } from "../src/lib/chatbot-fallback.ts";

assert.equal(analyzeLocally("นำสัตว์เลี้ยงเข้าพักได้มั้ย", false).intent, "unknown");
assert.equal(analyzeLocally("โรงแรมดีไหม", false).intent, "unknown");
assert.deepEqual(
  { intent: analyzeLocally("มี Wi-Fi ไหม", false).intent, topic: analyzeLocally("มี Wi-Fi ไหม", false).faqTopic },
  { intent: "faq", topic: "facilities" },
);
assert.equal(analyzeLocally("หาห้องวันที่ 10/09/2026 ถึง 12/09/2026 สำหรับ 2 คน", false).intent, "search_room");
assert.equal(analyzeLocally("I would like to ask about room availability", false).intent, "search_room");
assert.equal(analyzeLocally("Are there any rooms available?", false).intent, "search_room");
assert.equal(analyzeLocally("How can I book the room", false).intent, "search_room");
assert.equal(analyzeLocally("How do I reserve a room?", false).intent, "search_room");
assert.equal(analyzeLocally("I want to make a reservation", false).intent, "search_room");
assert.equal(analyzeLocally("Can you look for an available room?", false).intent, "search_room");
assert.equal(analyzeLocally("What is my booking number?", false).intent, "unknown");
assert.equal(analyzeLocally("เข้าพักได้ไหม", false).intent, "unknown");
assert.equal(findHandoffReason("ขอคุยกับเจ้าหน้าที่", []), "explicit_agent_request");
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
  buildUnknownChatbotMessage("ขออภัยค่ะ"),
  "ขออภัยค่ะ",
);

console.log("Chatbot routing checks passed");
