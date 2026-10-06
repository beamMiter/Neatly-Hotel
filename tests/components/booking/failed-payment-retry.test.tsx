// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { bookingEmailVerificationStorageKey } from "@/lib/booking-email-verification";
import type { BookingRecord } from "@/types/booking";

const paymentMocks = vi.hoisted(() => ({ confirm: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: paymentMocks.push }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt || "decorative"} />,
}));
vi.mock("@stripe/react-stripe-js", () => ({
  CardNumberElement: {},
  Elements: ({ children }: { children: React.ReactNode }) => children,
  useElements: () => ({ getElement: () => ({}) }),
  useStripe: () => ({ confirmCardPayment: paymentMocks.confirm }),
}));
vi.mock("@/features/booking/stripe-client", () => ({ stripePromise: null }));
vi.mock("@/features/booking/components/StripeCardFields", () => ({
  StripeCardFields: () => null,
}));
vi.mock("@/features/booking/components/EmailOtpVerification", () => ({
  EmailOtpVerification: () => <div>Email verification required</div>,
}));

import { BookingFailedView } from "@/features/booking/components/BookingFailedView";

const booking = {
  bookingCode: "NT-TEST",
  guestInfo: { email: "guest@example.com" },
} as BookingRecord;

describe("guest payment retry", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the stored email verification token when retrying payment", async () => {
    const token = "verified-token";
    window.sessionStorage.setItem(bookingEmailVerificationStorageKey("booking-1"), token);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ clientSecret: "secret" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BookingFailedView
        bookingId="booking-1"
        booking={booking}
        requiresEmailVerification
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings/booking-1/payment-intent",
      {
        method: "POST",
        headers: { "x-email-verification-token": token },
      },
    ));
  });

  it("requires email verification when no retry token is stored", () => {
    render(
      <BookingFailedView
        bookingId="booking-1"
        booking={booking}
        requiresEmailVerification
      />,
    );

    expect(screen.getByText("Email verification required")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull();
  });

  it("requests a fresh intent after each declined card instead of confirming the failed one again", async () => {
    let attempt = 0;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ clientSecret: `secret_${++attempt}` }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    paymentMocks.confirm.mockResolvedValueOnce({ error: { message: "Card declined" } })
      .mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    render(<BookingFailedView bookingId="booking-1" booking={booking} requiresEmailVerification={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Payment" }));
    expect(await screen.findByText("Card declined")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirm Payment" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Payment" }));
    await waitFor(() => expect(paymentMocks.push).toHaveBeenCalledWith("/booking/success?bookingId=booking-1"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(paymentMocks.confirm.mock.calls.map(([secret]) => secret)).toEqual(["secret_1", "secret_2"]);
  });
});
