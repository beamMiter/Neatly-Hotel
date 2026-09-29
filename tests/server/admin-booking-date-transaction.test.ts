import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  update: vi.fn(),
  getCatalog: vi.fn(),
  resolveSpecialRequests: vi.fn(),
  getPaymentBalance: vi.fn(),
  resolvePriorIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
  sendConfirmation: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  prisma: {
    booking: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/server/queries/special-requests.query", () => ({
  getSpecialRequestCatalog: mocks.getCatalog,
  resolveSelectedSpecialRequests: mocks.resolveSpecialRequests,
  validateStandardRequestCodes: () => true,
}));
vi.mock("@/server/queries/promo.query", () => ({ validatePromotionCode: vi.fn() }));
vi.mock("@/server/queries/notifications.query", () => ({ createNotification: vi.fn() }));
vi.mock("@/server/queries/bookings.query", () => ({
  AmountTooLowError: class AmountTooLowError extends Error {},
  InvalidPromoError: class InvalidPromoError extends Error {},
  RoomTypeNotFoundError: class RoomTypeNotFoundError extends Error {},
  getBookingPaymentBalance: mocks.getPaymentBalance,
  resolvePriorIntentToCancel: mocks.resolvePriorIntent,
}));
vi.mock("@/server/payments/stripe", () => ({
  cancelPaymentIntent: mocks.cancelPaymentIntent,
}));
vi.mock("@/server/services/booking-confirmation-email", () => ({
  maybeSendGuestBookingConfirmationEmail: mocks.sendConfirmation,
}));

import {
  AdminBookingPaymentTransitionError,
  AdminBookingRoomConflictError,
  updateBookingDates,
  updateBookingSpecialRequests,
} from "@/server/queries/admin-booking-edit.query";

const BOOKING_ID = "11111111-1111-1111-1111-111111111111";
const ROOM_ID = "22222222-2222-2222-2222-222222222222";
const original = {
  id: BOOKING_ID,
  status: "confirmed",
  checkIn: new Date("2026-12-01T00:00:00Z"),
  checkOut: new Date("2026-12-03T00:00:00Z"),
  totalAmount: 2000,
  promoCode: null,
  paymentStatus: "paid",
  specialRequests: [],
  rooms: [{ pricePerNight: 1000 }],
};

describe("admin booking date changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(original);
    mocks.getCatalog.mockResolvedValue([]);
    mocks.resolveSpecialRequests.mockReturnValue([]);
    mocks.getPaymentBalance.mockResolvedValue({ paidAmount: 0 });
    mocks.resolvePriorIntent.mockResolvedValue({ priorIntentToCancel: null });
    mocks.transaction.mockImplementation(async (callback) => callback({
      $queryRaw: mocks.queryRaw,
      booking: { update: mocks.update },
    }));
    mocks.queryRaw
      .mockResolvedValueOnce([{ room_id: ROOM_ID }])
      .mockResolvedValueOnce([{
        status: "confirmed",
        payment_status: "paid",
        total_amount: 2000,
        check_in: "2026-12-01",
        check_out: "2026-12-03",
      }])
      .mockResolvedValueOnce([{ count: BigInt(0) }]);
    mocks.update.mockResolvedValue({});
  });

  it("locks rooms, revalidates the booking, checks conflicts and updates in one transaction", async () => {
    await updateBookingDates(BOOKING_ID, {
      checkIn: "2026-12-02",
      checkOut: "2026-12-04",
    });

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.queryRaw).toHaveBeenCalledTimes(3);
    const [roomLockSql] = mocks.queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(roomLockSql.join("?")).toContain("for update of r");
    const [bookingLockSql] = mocks.queryRaw.mock.calls[1] as [TemplateStringsArray];
    expect(bookingLockSql.join("?")).toContain("for update");
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("rejects the mutation when a conflicting booking appears before the locked check", async () => {
    mocks.queryRaw.mockReset()
      .mockResolvedValueOnce([{ room_id: ROOM_ID }])
      .mockResolvedValueOnce([{
        status: "confirmed",
        payment_status: "paid",
        total_amount: 2000,
        check_in: "2026-12-01",
        check_out: "2026-12-03",
      }])
      .mockResolvedValueOnce([{ count: BigInt(1) }]);

    await expect(updateBookingDates(BOOKING_ID, {
      checkIn: "2026-12-02",
      checkOut: "2026-12-04",
    })).rejects.toBeInstanceOf(AdminBookingRoomConflictError);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("preserves the guest count for per-day-per-guest add-ons when extending a stay", async () => {
    mocks.findUnique.mockResolvedValue({
      ...original,
      specialRequests: [{ code: "breakfast", label: "Breakfast", price: 200, quantity: 4 }],
    });
    mocks.getCatalog.mockResolvedValue([
      { code: "breakfast", label: "Breakfast", price: 200, billingType: "per_day_guest" },
    ]);

    await updateBookingDates(BOOKING_ID, {
      checkIn: "2026-12-01",
      checkOut: "2026-12-05",
      paymentMethod: "cash",
    });

    expect(mocks.resolveSpecialRequests).toHaveBeenCalledWith(
      expect.any(Array),
      [{ code: "breakfast", count: 2 }],
      4,
    );
  });

  it("converts an increased unpaid booking into a consistent pay-at-hotel booking", async () => {
    mocks.findUnique.mockResolvedValue({
      ...original,
      status: "pending_payment",
      paymentStatus: "pending",
    });
    mocks.resolvePriorIntent.mockResolvedValue({ priorIntentToCancel: "pi_existing" });
    mocks.queryRaw.mockReset()
      .mockResolvedValueOnce([{ room_id: ROOM_ID }])
      .mockResolvedValueOnce([{
        status: "pending_payment",
        payment_status: "pending",
        total_amount: 2000,
        check_in: "2026-12-01",
        check_out: "2026-12-03",
      }])
      .mockResolvedValueOnce([{ count: BigInt(0) }]);

    await updateBookingDates(BOOKING_ID, {
      checkIn: "2026-12-01",
      checkOut: "2026-12-04",
    });

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "confirmed",
        paymentMethod: "cash",
        paymentStatus: "pay_at_hotel",
        expiresAt: null,
      }),
    }));
    expect(mocks.cancelPaymentIntent).toHaveBeenCalledWith("pi_existing");
    expect(mocks.sendConfirmation).toHaveBeenCalledWith(BOOKING_ID);
  });

  it("does not overwrite an unpaid state when a payment already succeeded", async () => {
    mocks.findUnique.mockResolvedValue({
      ...original,
      status: "pending_payment",
      paymentStatus: "pending",
    });
    mocks.getPaymentBalance.mockResolvedValue({ paidAmount: 2000 });

    await expect(updateBookingDates(BOOKING_ID, {
      checkIn: "2026-12-01",
      checkOut: "2026-12-04",
    })).rejects.toBeInstanceOf(AdminBookingPaymentTransitionError);

    expect(mocks.cancelPaymentIntent).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("checks assigned inventory before special requests activate an unpaid booking", async () => {
    mocks.findUnique.mockResolvedValue({
      ...original,
      status: "pending_payment",
      paymentStatus: "pending",
    });
    mocks.resolveSpecialRequests.mockReturnValue([
      { code: "breakfast", label: "Breakfast", price: 200, quantity: 1 },
    ]);
    mocks.queryRaw.mockReset()
      .mockResolvedValueOnce([{ room_id: ROOM_ID }])
      .mockResolvedValueOnce([{
        status: "pending_payment",
        payment_status: "pending",
        total_amount: 2000,
        check_in: "2026-12-01",
        check_out: "2026-12-03",
      }])
      .mockResolvedValueOnce([{ count: BigInt(0) }]);

    await updateBookingSpecialRequests(BOOKING_ID, {
      standardRequests: [],
      specialRequests: [{ code: "breakfast", count: 1 }],
      additionalRequest: null,
    });

    expect(mocks.queryRaw).toHaveBeenCalledTimes(3);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "confirmed",
        paymentMethod: "cash",
        paymentStatus: "pay_at_hotel",
        expiresAt: null,
      }),
    }));
  });
});
