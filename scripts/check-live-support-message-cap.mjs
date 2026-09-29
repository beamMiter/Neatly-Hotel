import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const client = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: conversation, error: createError } = await client
  .from("support_conversations")
  .insert({ visitor_token: randomUUID(), topic: "other" })
  .select("id")
  .single();
if (createError || !conversation) throw new Error("Unable to create the temporary cap probe conversation");

try {
  const first = await client.rpc("add_visitor_support_message", {
    p_conversation_id: conversation.id,
    p_content: "Message cap probe",
    p_max_messages: 1,
  });
  if (first.error) throw new Error(`First capped insert failed (${first.error.code ?? "unknown"})`);

  const second = await client.rpc("add_visitor_support_message", {
    p_conversation_id: conversation.id,
    p_content: "Message cap probe overflow",
    p_max_messages: 1,
  });
  if (second.error?.code !== "P0001" || !second.error.message.includes("support_message_limit_reached")) {
    throw new Error("The message cap did not reject the second insert");
  }

  console.log("PASS atomic Live Support message cap");
} finally {
  await client.from("support_conversations").delete().eq("id", conversation.id);
}
