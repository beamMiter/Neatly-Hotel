import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  sendConfirmation: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    booking: { updateMany: mocks.updateMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/server/services/booking-confirmation-email", () => ({
  maybeSendGuestBookingConfirmationEmail: mocks.sendConfirmation,
}));

import { markBookingCashConfirmed, updateBookingPaymentStatus } from "@/server/queries/bookings.query";

const BOOKING_ID = "11111111-1111-1111-1111-111111111111";
const ROOM_ID = "22222222-2222-2222-2222-222222222222";

describe("markBookingCashConfirmed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback({
      $queryRaw: mocks.queryRaw,
      booking: { updateMany: mocks.updateMany },
    }));
    mocks.queryRaw
      .mockResolvedValueOnce([{
        status: "pending_payment",
        payment_status: "pending",
        check_in: "2026-12-01",
        check_out: "2026-12-03",
      }])
      .mockResolvedValueOnce([{ room_id: ROOM_ID }])
      .mockResolvedValueOnce([{ count: BigInt(0) }]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("confirms cash only after locking the booking and assigned inventory", async () => {
    await expect(markBookingCashConfirmed(BOOKING_ID)).resolves.toBe(true);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.queryRaw).toHaveBeenCalledTimes(3);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: "pending_payment", paymentStatus: "pending" },
      data: {
        paymentMethod: "cash",
        paymentStatus: "pay_at_hotel",
        status: "confirmed",
        expiresAt: null,
      },
    });
    expect(mocks.sendConfirmation).toHaveBeenCalledWith(BOOKING_ID);
  });

  it("refuses confirmation when another active booking took the room", async () => {
    mocks.queryRaw.mockReset()
      .mockResolvedValueOnce([{
        status: "pending_payment",
        payment_status: "pending",
        check_in: "2026-12-01",
        check_out: "2026-12-03",
      }])
      .mockResolvedValueOnce([{ room_id: ROOM_ID }])
      .mockResolvedValueOnce([{ count: BigInt(1) }]);
    await expect(markBookingCashConfirmed(BOOKING_ID)).rejects.toThrow(
      "This room type is no longer available",
    );
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});

describe("updateBookingPaymentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("records the settled payment through an atomic pending-to-confirmed transition", async () => {
    await expect(updateBookingPaymentStatus(BOOKING_ID, "paid", "credit_card")).resolves.toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: "pending_payment", paymentStatus: "pending" },
      data: {
        paymentMethod: "credit_card",
        paymentStatus: "paid",
        status: "confirmed",
        expiresAt: null,
      },
    });
    expect(mocks.sendConfirmation).toHaveBeenCalledOnce();
  });

  it("marks only a pending booking cancelled when payment fails", async () => {
    await expect(updateBookingPaymentStatus(BOOKING_ID, "failed")).resolves.toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: "pending_payment", paymentStatus: "pending" },
      data: { paymentStatus: "failed", status: "cancelled", expiresAt: null },
    });
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });

  it("ignores a delayed event after the booking has already transitioned", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateBookingPaymentStatus(BOOKING_ID, "paid", "promptpay")).resolves.toBe(false);
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });
});
