# Booking payment fixes

Scope: the five payment issues selected from the project review. Changes are local; no shared database migration, booking mutation, live charge, or deployment was performed.

## Changed behavior

1. **Late settlement and room availability:** confirmation locks the booking and its physical rooms, then checks overlapping active reservations before confirming. A lost room causes cancellation and a full refund of the rejected payment. Stripe redelivery retries an interrupted refund instead of later confirming the room.
2. **Cancellation:** cancellation and payment creation serialize through the booking row lock. Cancellation inspects all Stripe attempts and cancels payable intents. A payment that wins the race is refunded. Explicit cancellation cannot be reopened by the retry endpoint. Top-ups are allowed only for confirmed or checked-in bookings.
3. **Original payment with an outstanding top-up:** refund eligibility uses the original cancellation timestamp and captured Stripe payments, independent of the booking's aggregate `pending` status or currently selected payment method. The existing 72-hour policy remains applicable to previously captured payments.
4. **Unreadable payment history:** balance reads throw, and collection endpoints return an error without creating a charge. The creation transaction rechecks the outstanding amount against the ledger before creating an intent.
5. **Card retry:** both card retry forms discard declined client secrets. A fresh attempt must acquire a valid hold and cancel the earlier payable intent before exposing a new secret. The backend also reconciles a success on an existing declined intent, checking inventory again. The success page waits for reconciliation instead of immediately redirecting because an older failure is still recorded.

## Implementation notes

- Booking and payment writes remain in `src/server/queries/`; touched API routes delegate to server services.
- The existing `payments.failure_message` field records a durable fulfillment rejection (`Booking could not accept this payment; refund required`). This does not add a payment status unsupported by the existing database constraint. Delayed decline events cannot overwrite that decision.
- Refunds use a stable per-intent idempotency key and also check Stripe's charge refund state, covering retries beyond Stripe's key retention window.
- External calls in the payment-creation transaction have a 30-second transaction timeout. An intent whose ledger insert cannot commit is canceled before the error is returned. Cancellation or refund failures are surfaced for retry; webhook failures return HTTP 500.
- Existing PromptPay work in the workspace is preserved.

## Verification

- Offline Vitest run: **27 suites / 125 tests passed**, with one worker and file parallelism disabled. A previous concurrent build/test run hit a worker-start timeout; the complete sequential rerun passed.
- `npm run build`: **passed**, including TypeScript and 54/54 generated pages.
- `npm run typecheck`: **passed**.
- `npm run lint`: **0 errors**, 6 pre-existing warnings.
- `node scripts/check-booking-access.mjs`: **passed**.
- `git diff --check`: **passed**.

Automated tests cover inventory conflicts, success after a decline, explicit cancellation, top-up eligibility, unreadable/stale balances, failed intent cleanup, cancellation racing with capture, partial-payment cancellation, delayed refund retries, webhook retry responses, API authorization, and card/success-page behavior. Tests mock Stripe and database calls; they do not constitute a concurrent PostgreSQL/Stripe end-to-end test.

The auth integration suites (`src/features/auth/actions.test.ts` and `src/app/api/register/route.test.ts`) require configured live Supabase credentials and were excluded from the offline run. They were already unable to initialize in the default test environment during the original audit.

Before production deployment, exercise the same five scenarios using a dedicated staging database and Stripe test mode, including duplicate/out-of-order webhook deliveries. No schema migration is required by these changes.
