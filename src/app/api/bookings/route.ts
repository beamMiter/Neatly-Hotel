import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/server/db";
import { createClient } from "@/server/db/supabase-server";
import { parseCreateBookingPayload } from "@/features/booking/validations";
import { validateStayDates } from "@/features/booking/date-rules";
import {
  AmountTooLowError,
  BookingConflictError,
  InvalidGuestsError,
  InvalidPromoError,
  RoomTypeNotFoundError,
  createPendingBooking,
  markBookingCashConfirmed,
  updateBookingPaymentStatus,
} from "@/server/queries/bookings.query";
import { cancelPaymentIntent, createBookingPaymentIntent } from "@/server/payments/stripe";
import { supabaseAdmin } from "@/server/db/supabase-admin";

export async function POST(request: Request) {
  // Booking creation runs entirely through Prisma (see bookings.query.ts's
  // transaction) — mirrors the same guard used by
  // src/app/api/booking/availability/route.ts.
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { message: "Database is not configured. Set DATABASE_URL to Supabase Postgres." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "You must be logged in to book a room" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseCreateBookingPayload(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const { data } = parsed;
  const dateError = validateStayDates(data.checkIn, data.checkOut);
  if (dateError) {
    return NextResponse.json({ message: dateError }, { status: 400 });
  }

  try {
    const { booking, pricing, expiresAt } = await createPendingBooking({
      customerId: user.id,
      roomTypeId: data.roomTypeId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      rooms: data.rooms,
      guestInfo: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth.toISOString().slice(0, 10),
        country: data.country,
      },
      standardRequests: data.standardRequests,
      specialRequests: data.specialRequests,
      additionalRequest: data.additionalRequest ?? null,
      promoCode: data.promoCode ?? null,
      paymentMethod: data.paymentMethod,
    });

    if (data.paymentMethod === "cash") {
      await markBookingCashConfirmed(booking.id);
      return NextResponse.json(
        { message: "Booking confirmed", bookingId: booking.id, paymentMethod: "cash" },
        { status: 201 },
      );
    }

    // The booking + booking_rooms rows are already committed at this point,
    // so a Stripe failure here would otherwise leave those rooms held for the
    // full 30-minute window with no way for the guest to pay — cancel the
    // booking to release them immediately before surfacing the error.
    let paymentIntent;
    try {
      paymentIntent = await createBookingPaymentIntent({
        bookingId: booking.id,
        amountThb: pricing.totalAmount,
      });
    } catch (error) {
      console.error("[api/bookings] PaymentIntent creation failed, releasing hold:", error);
      await updateBookingPaymentStatus(booking.id, "failed").catch((cleanupError) => {
        console.error("[api/bookings] failed to release hold after Stripe error:", cleanupError);
      });
      return NextResponse.json(
        { message: "Could not start the payment. Please try booking again." },
        { status: 502 },
      );
    }

    const { error: paymentInsertError } = await supabaseAdmin.from("payments").insert({
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: pricing.totalAmount,
      currency: "thb",
      status: "requires_payment_method",
    });
    // Not survivable: the webhook resolves which intent is current from this
    // table, so a booking with no payments row would have its settled charge
    // ignored. Cancel the intent and release the hold rather than hand back a
    // clientSecret the guest could pay against and never get confirmed.
    if (paymentInsertError) {
      console.error("[api/bookings] failed to insert payments row:", paymentInsertError);
      await cancelPaymentIntent(paymentIntent.id).catch((cancelError) => {
        console.error("[api/bookings] failed to cancel orphaned intent:", cancelError);
      });
      await updateBookingPaymentStatus(booking.id, "failed").catch((cleanupError) => {
        console.error("[api/bookings] failed to release hold:", cleanupError);
      });
      return NextResponse.json(
        { message: "Could not start the payment. Please try booking again." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        message: "Booking created",
        bookingId: booking.id,
        clientSecret: paymentIntent.client_secret,
        totalAmount: pricing.totalAmount,
        expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof RoomTypeNotFoundError) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 });
    }
    if (error instanceof InvalidGuestsError || error instanceof InvalidPromoError || error instanceof AmountTooLowError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("[api/bookings] POST failed:", error);
    return NextResponse.json({ message: "Failed to create booking" }, { status: 500 });
  }
}
