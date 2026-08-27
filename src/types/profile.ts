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

// Editable identity for a staff/admin account — separate table
// (staff_members, see 202608270001_staff_members_profile_fields.sql), kept
// apart from customer `profiles` per the team's call: staff_members sees
// little traffic, so its own columns are low-risk to extend. No
// dateOfBirth/country — nothing in the product reads those for staff.
export type StaffProfileForEdit = {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string | null;
};
