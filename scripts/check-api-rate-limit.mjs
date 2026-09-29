import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const keyHash = createHash("sha256")
  .update(`rate-limit-probe-${Date.now()}`)
  .digest("hex");
const client = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  const allowed = [];
  for (let index = 0; index < 3; index += 1) {
    const { data, error } = await client
      .rpc("consume_api_rate_limit", {
        p_key_hash: keyHash,
        p_limit: 2,
        p_window_seconds: 60,
      })
      .single();
    if (error) {
      throw new Error(
        `Rate-limit RPC failed (${error.code ?? "unknown"}): ${error.message}${error.details ? `; ${error.details}` : ""}`,
      );
    }
    allowed.push(data.allowed);
  }

  if (JSON.stringify(allowed) !== "[true,true,false]") {
    throw new Error(`Unexpected limiter result: ${JSON.stringify(allowed)}`);
  }
  console.log("PASS atomic rate-limit RPC");
} finally {
  await client.from("api_rate_limits").delete().eq("key_hash", keyHash);
}
