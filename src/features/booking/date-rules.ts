const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function bangkokTodayIso(): string {
  const now = new Date();
  const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const year = bangkokNow.getFullYear();
  const month = String(bangkokNow.getMonth() + 1).padStart(2, "0");
  const day = String(bangkokNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00+07:00`);
  const end = Date.parse(`${checkOut}T00:00:00+07:00`);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function validateStayDates(
  checkIn: string,
  checkOut: string,
): string | null {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) {
    return "Check-in and check-out must be valid dates (YYYY-MM-DD)";
  }

  const today = bangkokTodayIso();
  if (checkIn < today) {
    return "Check-in cannot be in the past";
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    return "Check-out must be at least one night after check-in";
  }

  return null;
}
