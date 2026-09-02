import type {
  ChatMessage,
  SupportMessageResponse,
} from "@/features/chatbot/components/chat-widget.types";

export function toChatMessage(message: SupportMessageResponse): ChatMessage {
  return {
    id: message.id,
    role: message.sender === "visitor" ? "user" : "assistant",
    content: message.content,
    createdAt: message.created_at,
  };
}

function messageTime(message: ChatMessage) {
  if (!message.createdAt) return Number.POSITIVE_INFINITY;
  const time = Date.parse(message.createdAt);
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function mergeChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
) {
  const messagesById = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) messagesById.set(message.id, message);

  return [...messagesById.values()].sort(
    (left, right) => messageTime(left) - messageTime(right),
  );
}

export function mergeSupportMessages(
  current: ChatMessage[],
  incoming: SupportMessageResponse[],
) {
  return mergeChatMessages(current, incoming.map(toChatMessage));
}
