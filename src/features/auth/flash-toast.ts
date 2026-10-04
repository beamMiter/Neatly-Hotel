// A short-lived cookie that survives a server-side redirect() to an
// unpredictable destination (login lands on redirectTo / room-management / "/"
// depending on role), unlike the ?reset=success query param used by
// resetPassword(), which always lands back on the one page (/login) that
// already knows how to read it.
export const FLASH_TOAST_COOKIE_NAME = "neatly-flash-toast";

export const FLASH_TOAST_MESSAGES = {
  "signed-in": "Signed in successfully.",
  "signed-out": "Signed out successfully.",
} as const;

export type FlashToastKey = keyof typeof FLASH_TOAST_MESSAGES;
