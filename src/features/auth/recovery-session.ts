// Marker cookie set only by the reset-link landing route, and required by
// the "set a new password" step.
//
// Without it, /forgot-password/reset would accept *any* signed-in session:
// someone who walks up to a machine where a customer stayed logged in could
// open that URL and set a new password without ever seeing the account's
// email. The recovery session that the emailed link creates is the only
// thing allowed to change a password this way.
export const RECOVERY_COOKIE_NAME = "neatly-password-recovery";

// Long enough to pick a password, short enough that an abandoned reset stops
// being usable well before the Supabase session itself expires.
export const RECOVERY_COOKIE_MAX_AGE_SECONDS = 15 * 60;
