import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pingDatabase: vi.fn(),
}));

vi.mock("@/server/queries/health.query", () => ({
  pingDatabase: mocks.pingDatabase,
}));

import { GET } from "@/app/api/cron/keep-alive/route";

const SECRET = "test-cron-secret";

function cronRequest(authorization?: string) {
  return new Request("http://localhost/api/cron/keep-alive", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("GET /api/cron/keep-alive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Happy Path", () => {
    it("pings the database and returns 200 for a request bearing the correct secret", async () => {
      mocks.pingDatabase.mockResolvedValue({ ok: true });

      const response = await GET(cronRequest(`Bearer ${SECRET}`));

      expect(mocks.pingDatabase).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(typeof body.pingedAt).toBe("string");
    });
  });

  describe("Error Case", () => {
    it("returns 401 and skips the ping when the Authorization header is missing", async () => {
      const response = await GET(cronRequest());

      expect(response.status).toBe(401);
      expect(mocks.pingDatabase).not.toHaveBeenCalled();
    });

    it("returns 401 and skips the ping when the bearer token is wrong", async () => {
      const response = await GET(cronRequest("Bearer not-the-secret"));

      expect(response.status).toBe(401);
      expect(mocks.pingDatabase).not.toHaveBeenCalled();
    });

    it("returns 503 without even checking the header when CRON_SECRET isn't configured", async () => {
      vi.stubEnv("CRON_SECRET", "");

      const response = await GET(cronRequest(`Bearer ${SECRET}`));

      expect(response.status).toBe(503);
      expect(mocks.pingDatabase).not.toHaveBeenCalled();
    });

    it("returns 502 when the Supabase ping itself fails", async () => {
      mocks.pingDatabase.mockResolvedValue({ ok: false, error: "connection refused" });

      const response = await GET(cronRequest(`Bearer ${SECRET}`));

      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        message: "connection refused",
      });
    });
  });
});
