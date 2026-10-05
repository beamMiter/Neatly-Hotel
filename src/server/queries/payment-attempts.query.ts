import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";

export const PAYMENT_REQUIRES_REFUND = "Booking could not accept this payment; refund required";

// A retry deliberately opens a NEW PaymentIntent for the same booking, so a
// delayed or redelivered event from a superseded intent can arrive after the
// booking is already settled. Only the booking's most recent payments row may
// move the booking's own status — otherwise a late payment_failed from the
// first attempt would un-confirm a booking the retry already paid for.
// This gate exists to ignore a *superseded* intent, which we can only know
// about from a newer payments row.
//
// On a read error there is no safe answer: guessing "current" lets a stale
// payment_failed cancel a booking the retry already paid for, and guessing
// "superseded" drops a real settled charge. So it throws — the caller's
// catch returns non-2xx and Stripe redelivers the event later, which is the
// only outcome that loses nothing. No row at all is not an error: it means
// nothing has superseded this intent, so it stands.
export async function isCurrentIntentForBooking(bookingId: string, intentId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[api/payments/webhook] could not resolve the current intent:", error);
    throw new Error("Could not resolve the current payment intent for this booking");
  }

  const latest = data?.[0]?.stripe_payment_intent_id;
  if (!latest) return true;
  return latest === intentId;
}

export async function updatePaymentAttempt(
  intentId: string,
  nextStatus: "succeeded" | "failed" | "canceled",
  values: Record<string, string | null>,
): Promise<boolean> {
  const allowedCurrentStatuses =
    nextStatus === "succeeded"
      ? ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "failed", "succeeded"]
      : nextStatus === "failed"
        ? ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "failed"]
        : ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "failed", "canceled"];
  let update = supabaseAdmin
    .from("payments")
    .update(values)
    .eq("stripe_payment_intent_id", intentId)
    .in("status", allowedCurrentStatuses);
  // A delayed decline must not overwrite a durable refund decision made by
  // cancellation or settlement while this event was in flight.
  if (nextStatus === "failed") {
    update = update.or(`failure_message.is.null,failure_message.neq.${PAYMENT_REQUIRES_REFUND}`);
  }
  const { data, error } = await update
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[api/payments/webhook] could not update payment attempt:", error);
    throw new Error("Could not update the payment attempt");
  }
  if (!data) {
    const { data: existing, error: readError } = await supabaseAdmin
      .from("payments")
      .select("status")
      .eq("stripe_payment_intent_id", intentId)
      .maybeSingle();

    if (readError || !existing) {
      console.error("[api/payments/webhook] payment attempt is missing after a conditional update:", readError);
      throw new Error("Could not find the payment attempt");
    }
  }
  // A terminal success must never be downgraded by an older failed/canceled
  // event. An existing row that did not match the allowed states means the
  // transition was intentionally ignored; the booking must stay unchanged.
  return Boolean(data);
}
