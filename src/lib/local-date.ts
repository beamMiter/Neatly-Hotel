// A date-only <input>/calendar picker (e.g. DateOfBirthField) builds its
// value as `new Date(year, month, day)` — midnight in the browser's LOCAL
// timezone, carrying no timezone info of its own. `date.toISOString()`
// converts that instant to UTC before formatting, which silently shifts the
// calendar date by a day for any non-zero UTC offset: for a +07 browser
// (Thailand — this app's actual audience), January 14th local midnight is
// January 13th 17:00 UTC, so `.toISOString().slice(0, 10)` stores "13", not
// the "14" the person actually picked. Use this instead wherever a picked
// calendar date (not a real timestamp) needs to become a "YYYY-MM-DD"
// string — it reads the Date's own local year/month/day, never touching UTC.
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
