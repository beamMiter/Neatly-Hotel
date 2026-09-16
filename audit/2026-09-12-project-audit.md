# Project bug audit — updated 14 September 2026

Branch: `fix/high-priority-security-audit` · based on `origin/dev` at source commit `2f7884f`.

## Current status

The seven high-priority findings (A01–A07) were committed as `ade83c1`. The four medium-priority findings (A08–A11) are fixed in the follow-up change set on this branch. The branch has not been pushed and the security migration has not been applied to the shared database.

| ID | Priority | Finding | Status |
| --- | --- | --- | --- |
| A01 | High | Legacy migration allowed anonymous room type/image writes | Fixed by `202609120001_lock_down_room_writes.sql`; migration not applied |
| A02 | High | Code+email lookup exposed member bookings without ownership | Fixed; lookup now permits guest bookings only |
| A03 | High | Expired holds could be confirmed as cash after inventory was resold | Fixed; inventory is locked and overlap-checked atomically |
| A04 | High | Delayed/repeated Stripe events could reverse booking/payment lifecycle state | Fixed with conditional atomic transitions |
| A05 | High | Webhook returned success when its payment-row write failed | Fixed; write failures return 500 for Stripe retry |
| A06 | High | Cancellation refunded only the latest successful payment/top-up | Fixed; every captured intent is refunded with a stable idempotency key |
| A07 | High | Admin date changes had an availability check/update race | Fixed; room lock, revalidation, conflict check, and update share one transaction |
| A08 | Medium | Extending a stay can reduce a per-day-per-guest add-on count | Fixed; stored quantity is decoded using the original stay length before repricing the new dates |
| A09 | Medium | Anonymous guest payment retry omits the email verification token | Fixed; the token is retained per booking, sent on retry, and requested again when absent or expired |
| A10 | Medium | Reading the room list can recreate a deleted seeded room | Fixed; room reads no longer perform seed writes |
| A11 | Medium | Admin edits to unpaid bookings can leave an inconsistent hold/payment state | Fixed; active payments are guarded/cancelled and cash conversion atomically confirms the booking, clears expiry, and checks inventory |

## Verification after all fixes

| Check | Result |
| --- | --- |
| TypeScript (`npm.cmd run typecheck`) | Passed |
| ESLint on every changed TypeScript/test file | Passed |
| Offline test directory (`npm.cmd test -- tests --maxWorkers=1`) | 20 files passed, 80 tests passed |
| Focused medium-priority regression tests | 3 files passed, 9 tests passed |
| Production build (`npm.cmd run build`) | Passed; 53 static/dynamic routes generated |

The earlier five failures in `bookings-payment-method.test.ts` were caused by a stale Prisma mock. That test was updated to exercise the new atomic transitions and now passes.

## Scope and limits

The audit covered authentication/authorization, profile, booking/search/availability, payments/refunds, admin booking edits, room management/property, notifications, analytics, chatbot/live support, migrations, and test configuration.

No shared database migration, real Supabase write, real Stripe operation, email delivery, or browser end-to-end test was performed. The actual grants and policies installed on the shared Supabase database still need verification when the new migration is deployed. Analytics intentionally uses its mock dataset, and the known split between local Supabase and Prisma databases was not treated as a new bug.
