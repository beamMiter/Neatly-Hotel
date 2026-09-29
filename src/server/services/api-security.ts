import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { consumeRateLimit } from "@/server/queries/rate-limit.query";

type RateLimitRule = {
  scope: string;
  limit: number;
  windowSeconds: number;
  subject?: string;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limit storage is unavailable");
    this.name = "RateLimitUnavailableError";
  }
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "PayloadTooLargeError";
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super("Request body must be valid JSON");
    this.name = "InvalidJsonError";
  }
}

const MAX_FORWARDED_VALUE_LENGTH = 128;

function requestAddress(request: Request): string {
  const direct = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const address = (direct ?? forwarded ?? "unknown").trim();
  return address.slice(0, MAX_FORWARDED_VALUE_LENGTH) || "unknown";
}

function hashRateLimitKey(value: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SECRET_KEY;
  if (!salt) throw new Error("RATE_LIMIT_SALT or SUPABASE_SECRET_KEY is required");
  return createHmac("sha256", salt).update(value).digest("hex");
}

export async function checkRateLimits(request: Request, rules: RateLimitRule[]): Promise<RateLimitResult> {
  const address = requestAddress(request);
  let results;
  try {
    results = await Promise.all(
      rules.map((rule) =>
        consumeRateLimit({
          keyHash: hashRateLimitKey(`${rule.scope}:${rule.subject ?? address}`),
          limit: rule.limit,
          windowSeconds: rule.windowSeconds,
        }),
      ),
    );
  } catch {
    throw new RateLimitUnavailableError();
  }

  const blocked = results.filter((result) => !result.allowed);
  return {
    allowed: blocked.length === 0,
    retryAfterSeconds: Math.max(0, ...blocked.map((result) => result.retry_after_seconds)),
  };
}

export function rateLimitUnavailableResponse() {
  return Response.json(
    { error: "Service temporarily unavailable. Please try again later." },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
  );
}

export function rateLimitExceededResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
      },
    },
  );
}

export function hasOversizedBody(request: Request, maxBytes: number): boolean {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return false;
  const length = Number.parseInt(rawLength, 10);
  return Number.isFinite(length) && length > maxBytes;
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (hasOversizedBody(request, maxBytes)) throw new PayloadTooLargeError();
  if (!request.body) throw new InvalidJsonError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}

export function requestId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && supplied.length <= 100 ? supplied : randomUUID();
}

export function logApiFailure(scope: string, id: string, error: unknown) {
  console.error(`[${scope}] request failed`, {
    requestId: id,
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
}
