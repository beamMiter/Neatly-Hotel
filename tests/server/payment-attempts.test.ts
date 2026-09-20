import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: { from: mocks.from } }));
import { PAYMENT_REQUIRES_REFUND, updatePaymentAttempt } from "@/server/queries/payment-attempts.query";

it("atomically excludes a refund decision from a delayed decline update", async () => {
  const chain = { update: vi.fn(), eq: vi.fn(), in: vi.fn(), or: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
  for (const key of ["update", "eq", "in", "or", "select"] as const) chain[key].mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: { status: "failed" }, error: null });
  mocks.from.mockReturnValue(chain);
  expect(await updatePaymentAttempt("pi_old", "failed", { status: "failed", failure_message: "declined" })).toBe(false);
  expect(chain.or).toHaveBeenCalledWith(`failure_message.is.null,failure_message.neq.${PAYMENT_REQUIRES_REFUND}`);
});
