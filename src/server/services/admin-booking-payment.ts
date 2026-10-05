import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import {
  AmountTooLowError,
  createTopUpPaymentAttempt,
  getBookingPaymentBalance,
  getAdminBookingPaymentState,
  PaymentIntentBlockedError,
} from "@/server/queries/bookings.query";
import { BookingNotFoundError } from "@/server/queries/customer-bookings.query";
import {
  authorizationErrorResponse,
  requireStaff,
} from "@/server/services/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function resolvePaymentUrl(request: Request, bookingId: string): string {
  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "";
  const path = `/booking/payment?bookingId=${bookingId}`;
  return origin ? `${origin}${path}` : path;
}

function isOutstandingTopUp(params: {
  status: string;
  paymentStatus: string;
  amountDue: number;
}): boolean {
  return (
    params.amountDue > 0 &&
    params.paymentStatus === "pending" &&
    ["confirmed", "checked_in"].includes(params.status)
  );
}

export async function handleAdminBookingPayment(request: Request, context: RouteContext) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { message: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
      { status: 503 },
    );
  }

  try {
    await requireStaff();
  } catch (error) {
    const response = authorizationErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const { id } = await context.params;

  let balance;
  let row;
  try {
    row = await getAdminBookingPaymentState(id);
    balance = await getBookingPaymentBalance(id);
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Unable to verify the outstanding balance. Please try again." }, { status: 502 });
  }

  if (
    !isOutstandingTopUp({
      status: row.status,
      paymentStatus: row.paymentStatus,
      amountDue: balance.amountDue,
    })
  ) {
    return NextResponse.json(
      { message: "This booking has no outstanding card payment to collect" },
      { status: 422 },
    );
  }

  try {
    const { clientSecret } = await createTopUpPaymentAttempt(id, balance.amountDue);
    return NextResponse.json({
      clientSecret,
      amountDue: balance.amountDue,
      paymentUrl: resolvePaymentUrl(request, id),
    });
  } catch (error) {
    if (error instanceof PaymentIntentBlockedError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof AmountTooLowError) {
      return NextResponse.json(
        { message: "The amount due is below the minimum card charge" },
        { status: 422 },
      );
    }
    console.error("[api/admin/bookings/payment-intent] POST failed:", error);
    return NextResponse.json({ message: "Failed to create payment intent" }, { status: 502 });
  }
}
