import "server-only";
import { prisma } from "@/server/db";
import { sendGuestBookingConfirmationEmail } from "@/server/services/email";

function toDateLabel(value: Date | string): string {
  const iso = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return iso;
}

/**
 * Sends a confirmation email for guest bookings only (customer_id is null).
 * Members already have /booking-history — skip them.
 *
 * Failures are logged and swallowed so payment confirmation is never blocked
 * by the mailer.
 */
export async function maybeSendGuestBookingConfirmationEmail(bookingId: string): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<
      {
        customer_id: string | null;
        guest_email: string | null;
        guest_first_name: string | null;
        booking_code: string;
        check_in: Date;
        check_out: Date;
        total_amount: { toString(): string } | number;
        status: string;
      }[]
    >`
      select customer_id, guest_email, guest_first_name, booking_code,
             check_in, check_out, total_amount, status
      from bookings
      where id = ${bookingId}::uuid
      limit 1
    `;

    const booking = rows[0];
    if (!booking) {
      console.info(`[booking-confirmation-email] skip: booking not found id=${bookingId}`);
      return;
    }
    if (booking.customer_id !== null) {
      console.info(
        `[booking-confirmation-email] skip: member booking code=${booking.booking_code}`,
      );
      return;
    }
    if (!booking.guest_email) {
      console.info(
        `[booking-confirmation-email] skip: missing guest_email code=${booking.booking_code}`,
      );
      return;
    }
    if (booking.status !== "confirmed") {
      console.info(
        `[booking-confirmation-email] skip: status=${booking.status} code=${booking.booking_code}`,
      );
      return;
    }

    const sent = await sendGuestBookingConfirmationEmail({
      to: booking.guest_email,
      guestFirstName: booking.guest_first_name ?? "Guest",
      bookingCode: booking.booking_code,
      checkIn: toDateLabel(booking.check_in),
      checkOut: toDateLabel(booking.check_out),
      totalAmount: Number(booking.total_amount),
    });

    if (!sent.ok) {
      console.error(
        `[booking-confirmation-email] send failed code=${booking.booking_code} to=${booking.guest_email}:`,
        sent.message,
      );
      return;
    }

    console.info(
      `[booking-confirmation-email] sent code=${booking.booking_code} to=${booking.guest_email}`,
    );
  } catch (error) {
    console.error("[booking-confirmation-email] unexpected failure:", error);
  }
}
