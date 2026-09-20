import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), list: vi.fn(), create: vi.fn() }));
vi.mock("stripe", () => ({ default: class Stripe {
  paymentIntents = { retrieve: mocks.retrieve };
  refunds = { list: mocks.list, create: mocks.create };
} }));
import { refundPayment } from "@/server/payments/stripe";

describe("refund reconciliation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_mock");
  });
  it("recognizes a refund even after the Stripe idempotency key has expired", async () => {
    mocks.retrieve.mockResolvedValue({ latest_charge: { refunded: true } });
    mocks.list.mockResolvedValue({ data: [{ id: "re_existing", status: "succeeded" }] });
    expect(await refundPayment("pi_paid", "stable_key")).toEqual({ id: "re_existing", status: "succeeded" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("submits a full remaining refund using the caller's stable key", async () => {
    mocks.retrieve.mockResolvedValue({ latest_charge: { refunded: false } });
    mocks.create.mockResolvedValue({ id: "re_new", status: "succeeded" });
    await refundPayment("pi_paid", "stable_key");
    expect(mocks.create).toHaveBeenCalledWith({ payment_intent: "pi_paid" }, { idempotencyKey: "stable_key" });
  });
  it("does not report a failed refund as completed", async () => {
    mocks.retrieve.mockResolvedValue({ latest_charge: { refunded: false } });
    mocks.create.mockResolvedValue({ status: "failed" });
    await expect(refundPayment("pi_paid", "stable_key")).rejects.toThrow("did not succeed");
  });
});
