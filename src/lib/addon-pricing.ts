// How a special-request add-on is priced — adopted from the team's
// feat/booking-flow branch, which modeled these per real hotel pricing
// instead of a generic manual quantity (this project's earlier approach).
// Kept as a plain, framework-agnostic function (no "server-only") so both
// the client-side price preview and the server's authoritative resolver
// call the exact same math — no drift between what the guest sees and what
// they're charged.
export type AddOnBillingType = "per_stay" | "per_night" | "per_leg" | "per_day_guest";

// per_leg: 1 or 2 legs (outbound / return). per_day_guest: 1 or 2 guests.
// Neither billing type has a use case above 2, so this bounds both.
export const MAX_ADD_ON_COUNT = 2;

/**
 * `count` is only meaningful for per_leg (legs chosen) and per_day_guest
 * (guests) — the client sends it for those two, and it's ignored for
 * per_stay/per_night, which are priced from `nights` alone. Returns the
 * final multiplier: the line total is always `price * quantity`.
 */
// Reverse of resolveAddOnQuantity for edit forms — turns the stored line
// quantity back into the 1-or-2 count the UI picker uses.
export function selectionCountFromStoredQuantity(
  billingType: AddOnBillingType,
  quantity: number,
  nights: number,
): number {
  const clampedNights = Math.max(Math.trunc(nights), 1);
  const clampedQuantity = Math.max(Math.trunc(quantity), 1);

  switch (billingType) {
    case "per_leg":
      return Math.min(clampedQuantity, MAX_ADD_ON_COUNT);
    case "per_day_guest":
      return Math.min(Math.max(Math.round(clampedQuantity / clampedNights), 1), MAX_ADD_ON_COUNT);
    default:
      return 1;
  }
}

export function resolveAddOnQuantity(
  billingType: AddOnBillingType,
  count: number | undefined,
  nights: number,
): number {
  const clampedNights = Math.max(Math.trunc(nights), 1);
  const clampedCount = Math.min(Math.max(Math.trunc(count ?? 1), 1), MAX_ADD_ON_COUNT);

  switch (billingType) {
    case "per_stay":
      return 1;
    case "per_night":
      return clampedNights;
    case "per_leg":
      return clampedCount;
    case "per_day_guest":
      return clampedCount * clampedNights;
    default:
      return 1;
  }
}
