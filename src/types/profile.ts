// Full set of fields the "edit my profile" form needs to prefill itself —
// return type of getOwnProfileForEdit (src/server/queries/profiles.query.ts).
// Distinct from AccountSummary (navbar chrome only) and ProfilePrefill
// (src/types/booking.ts, booking-wizard prefill) even though all three read
// from the same `profiles` row: each is shaped for what its one caller
// actually renders.
export type OwnProfileForEdit = {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string | null; // YYYY-MM-DD
  country: string;
  avatarUrl: string | null;
};
