// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { BookingRecord } from "@/types/booking";
const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
import { BookingSuccessView } from "@/features/booking/components/BookingSuccessView";
const booking = {
  status: "cancelled", paymentStatus: "failed", paymentMethod: "credit_card", cancelledAt: null,
  checkIn: "2026-12-01", checkOut: "2026-12-02", specialRequests: [], totalAmount: 1500,
  discountAmount: 0, bookingCode: "TEST", rooms: 1, guests: 2,
} as unknown as BookingRecord;
function view(initialBooking: BookingRecord) {
  return <BookingSuccessView bookingId="booking" initialBooking={initialBooking} checkInTimeLabel="14:00" checkOutTimeLabel="12:00" isLoggedIn />;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("success page reconciliation", () => {
  it("waits for the successful retry to reconcile even if the old failure is still in the booking", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => new Response(JSON.stringify(options ? {} : {
      booking: { ...booking, status: "confirmed", paymentStatus: "paid" },
    }))));
    render(view(booking));
    expect(await screen.findByText("Thank you for booking")).toBeTruthy();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("does not show a booking confirmation for a refunded payment", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    render(view({ ...booking, status: "refunded", paymentStatus: "paid" }));
    expect(screen.getByText("Your payment is being returned")).toBeTruthy();
    expect(screen.queryByText("Thank you for booking")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
