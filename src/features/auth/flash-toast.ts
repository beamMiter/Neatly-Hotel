// Shared toast copy for auth transitions (sign-in, sign-out) that redirect
// right after, so every call site reads the same wording. Each caller fires
// these itself, client-side, right before navigating — a cookie set
// server-side just before a server action's redirect() didn't reliably land
// before the navigation (confirmed in a real browser: the toast never
// appeared), so this is plain client-side state, not a flash-message cookie.
export const FLASH_TOAST_MESSAGES = {
  "signed-in": "Signed in successfully.",
  "signed-out": "Signed out successfully.",
} as const;
