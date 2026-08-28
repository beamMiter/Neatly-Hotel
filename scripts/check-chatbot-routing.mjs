import assert from "node:assert/strict";
import { analyzeLocally, findHandoffReason } from "../src/server/services/chatbot-intent.service.ts";
import { buildUnknownChatbotMessage } from "../src/lib/chatbot-fallback.ts";

assert.equal(analyzeLocally("นำสัตว์เลี้ยงเข้าพักได้มั้ย", false).intent, "unknown");
assert.equal(analyzeLocally("โรงแรมดีไหม", false).intent, "unknown");
assert.deepEqual(
  { intent: analyzeLocally("มี Wi-Fi ไหม", false).intent, topic: analyzeLocally("มี Wi-Fi ไหม", false).faqTopic },
  { intent: "faq", topic: "facilities" },
);
assert.equal(analyzeLocally("หาห้องวันที่ 10/09/2026 ถึง 12/09/2026 สำหรับ 2 คน", false).intent, "search_room");
assert.equal(analyzeLocally("เข้าพักได้ไหม", false).intent, "unknown");
assert.equal(findHandoffReason("ขอคุยกับเจ้าหน้าที่", []), "explicit_agent_request");
assert.equal(findHandoffReason("ขอคืนเงินได้ไหม", []), null);
assert.equal(findHandoffReason("ถามซ้ำ", [{ role: "user", content: "ถามซ้ำ" }]), null);

assert.equal(
  buildUnknownChatbotMessage("ขออภัยค่ะ"),
  "ขออภัยค่ะ",
);

console.log("Chatbot routing checks passed");
