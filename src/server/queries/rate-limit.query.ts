import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

export async function consumeRateLimit(input: {
  keyHash: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitRow> {
  const { data, error } = await supabaseAdmin
    .rpc("consume_api_rate_limit", {
      p_key_hash: input.keyHash,
      p_limit: input.limit,
      p_window_seconds: input.windowSeconds,
    })
    .single();

  if (error || !data) {
    throw new Error("Rate limit storage is unavailable");
  }

  return data as RateLimitRow;
}
