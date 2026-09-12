import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  prisma: {
    booking: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/server/queries/special-requests.query", () => ({
  getSpecialRequestCatalog: async () => [],
  resolveSelectedSpecialRequests: () => [],
  validateStandardRequestCodes: () => true,
}));
vi.mock("@/server/queries/promo.query", () => ({ validatePromotionCode: vi.fn() }));
vi.mock("@/server/queries/notifications.query", () => ({ createNotification: vi.fn() }));
vi.mock("@/server/services/booking-confirmation-email", () => ({
  maybeSendGuestBookingConfirmationEmail: vi.fn(),
}));

import {
  AdminBookingRoomConflictError,
  updateBookingDates,
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
});
