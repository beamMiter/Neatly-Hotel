// Shared toast copy for auth transitions (sign-in, sign-out, account created)
// that navigate right after, so every call site reads the same wording and
// uses the same hand-off mechanism.
//
// Calling toast.success() and router.push() back to back fires the toast
// immediately, on the page you're leaving — it visibly flashes before the
// redirect, not after arriving on the destination. queueFlashToast() instead
// stashes the message in sessionStorage (synchronous, no server round trip,
// so no risk of a cookie not landing before the navigation) and
// FlashToastListener — mounted once at the root layout — reads it once the
// *new* page has actually mounted, so the toast always lands on the
// destination, never the page being left.
export type FlashToastKey = "signed-in" | "signed-out" | "account-created";
type FlashToastMessage = { title: string; description?: string };

export const FLASH_TOAST_MESSAGES: Record<FlashToastKey, FlashToastMessage> = {
  "signed-in": { title: "Signed in successfully." },
  "signed-out": { title: "Signed out successfully." },
  "account-created": { title: "Account created!", description: "Please log in to continue." },
};

const STORAGE_KEY = "neatly-flash-toast";

export function queueFlashToast(key: FlashToastKey) {
  try {
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage can throw in private-browsing/locked-down contexts — losing
    // the one-off toast isn't worth failing the sign-in/out itself over.
  }
}

export function takeQueuedFlashToast(): FlashToastKey | null {
  try {
    const key = sessionStorage.getItem(STORAGE_KEY);
    if (!key || !(key in FLASH_TOAST_MESSAGES)) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return key as FlashToastKey;
  } catch {
    return null;
  }
}
