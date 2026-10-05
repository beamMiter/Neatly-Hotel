import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  balance: vi.fn(), booking: vi.fn(), adminBooking: vi.fn(), topUp: vi.fn(), initial: vi.fn(), extend: vi.fn(), staff: vi.fn(),
}));
vi.mock("@/server/db", () => ({ hasDatabaseUrl: () => true }));
vi.mock("@/server/db/supabase-server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "customer" } } }) } }) }));
vi.mock("@/server/queries/bookings.query", () => ({
  getBookingById: mocks.booking, getBookingPaymentBalance: mocks.balance, getAdminBookingPaymentState: mocks.adminBooking,
  createTopUpPaymentAttempt: mocks.topUp, createInitialPaymentAttempt: mocks.initial, extendBookingHold: mocks.extend,
  isTopUpPaymentEligible: (b: { status: string; paymentStatus: string }, balance: { amountDue: number }) =>
    ["confirmed", "checked_in"].includes(b.status) && b.paymentStatus === "pending" && balance.amountDue > 0,
  AmountTooLowError: class extends Error {}, PaymentIntentBlockedError: class extends Error {},
}));
vi.mock("@/server/queries/customer-bookings.query", () => ({ BookingNotFoundError: class extends Error {} }));
vi.mock("@/server/services/booking-access", () => ({ bookingAccessErrorResponse: () => null }));
vi.mock("@/server/services/authorization", () => ({ requireStaff: mocks.staff, authorizationErrorResponse: () => new Response(null, { status: 403 }) }));
vi.mock("@/server/queries/email-otp.query", () => ({ assertEmailVerificationToken: () => true }));
import { POST as customerPayment } from "@/app/api/bookings/[id]/payment-intent/route";
import { POST as adminPayment } from "@/app/api/admin/bookings/[id]/payment-intent/route";

const context = { params: Promise.resolve({ id: "booking" }) };
const request = () => new Request("http://localhost/api/bookings/booking/payment-intent", { method: "POST" });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.booking.mockResolvedValue({ id: "booking", status: "confirmed", paymentStatus: "pending", totalAmount: 1500 });
  mocks.adminBooking.mockResolvedValue({ status: "confirmed", paymentStatus: "pending" });
  mocks.balance.mockResolvedValue({ amountDue: 500, paidAmount: 1000 });
});
describe("payment collection routes", () => {
  it.each([customerPayment, adminPayment])("does not collect money when balance lookup fails", async (handler) => {
    mocks.balance.mockRejectedValue(new Error("ledger unavailable"));
    expect((await handler(request(), context)).status).toBe(502);
    expect(mocks.topUp).not.toHaveBeenCalled();
    expect(mocks.initial).not.toHaveBeenCalled();
  });
  it("refuses a cancelled customer booking with a pending balance", async () => {
    mocks.booking.mockResolvedValue({ status: "cancelled", paymentStatus: "pending" });
    mocks.extend.mockResolvedValue(false);
    expect((await customerPayment(request(), context)).status).toBe(409);
    expect(mocks.topUp).not.toHaveBeenCalled();
    expect(mocks.initial).not.toHaveBeenCalled();
  });
  it("refuses admin top-ups for completed bookings", async () => {
    mocks.adminBooking.mockResolvedValue({ status: "completed", paymentStatus: "pending" });
    expect((await adminPayment(request(), context)).status).toBe(422);
    expect(mocks.topUp).not.toHaveBeenCalled();
  });
  it("still requires staff authorization before looking up financial data", async () => {
    mocks.staff.mockRejectedValue(new Error("forbidden"));
    expect((await adminPayment(request(), context)).status).toBe(403);
    expect(mocks.balance).not.toHaveBeenCalled();
  });
});
