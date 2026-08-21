// \p{L} (Unicode "letter") covers Thai as well as Latin names. \p{M}
// (combining mark) is required too — Thai vowel/tone signs like the ี in
// "ใจดี" attach to the previous consonant as marks, not letters, so names
// using them would otherwise be wrongly rejected. Spaces, hyphens and
// apostrophes allow compound/hyphenated names like "Mary-Jane" or
// "O'Brien" without opening the field up to digits or symbols.
export const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'-]*$/u;

export const PHONE_PATTERN = /^0[0-9]{8,9}$/;

// Deliberately looser than zod's built-in `.uuid()`, which additionally
// requires RFC 4122 version/variant nibbles (`[1-5]` and `[89ab]`) — some of
// this project's seeded rows (e.g. room_types) use hand-written "vanity"
// UUIDs like `a1000000-0000-0000-0000-000000000001` that Postgres accepts
// fine as `uuid` but `.uuid()` rejects, failing validation for real rows.
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
