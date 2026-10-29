// Romania switches between UTC+2 (winter) and UTC+3 (summer), so a fixed "+03:00" offset
// moves orders placed between 23:00 and 23:59 into the next day for half of the year.
// Everything here resolves the offset for the actual date via the Europe/Bucharest time zone.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Bucharest",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

function partsOf(date: Date): Record<string, number> {
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function toBucharestParts(date: Date) {
  const { year, month, day, hour } = partsOf(date);
  return { year, month, day, hour };
}

/** "YYYY-MM-DD" of the given instant in Romania */
export function bucharestDateKey(date: Date): string {
  const { year, month, day } = toBucharestParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** "YYYY-MM" of the given instant in Romania */
export function bucharestMonthKey(date: Date): string {
  const { year, month } = toBucharestParts(date);
  return `${year}-${pad(month)}`;
}

function offsetMs(date: Date): number {
  const v = partsOf(date);
  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function wallClockToUtcIso(dateStr: string, hour: number, minute: number, second: number, ms: number): string {
  if (!DATE_PATTERN.test(dateStr)) throw new RangeError(`Invalid date: ${dateStr}`);
  const [year, month, day] = dateStr.split("-").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  // Second pass settles the offset when the guess lands on the other side of a clock change
  const guess = wall - offsetMs(new Date(wall - 3 * 60 * 60 * 1000));
  return new Date(wall - offsetMs(new Date(guess))).toISOString();
}

/** "YYYY-MM-DD" shifted by a number of calendar days (negative = earlier) */
export function shiftDateKey(dateStr: string, days: number): string {
  if (!DATE_PATTERN.test(dateStr)) throw new RangeError(`Invalid date: ${dateStr}`);
  // Noon UTC keeps the shift on the right calendar day regardless of clock changes
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

/** UTC instant of 00:00:00.000 Romania time on the given "YYYY-MM-DD" */
export function bucharestDayStartIso(dateStr: string): string {
  return wallClockToUtcIso(dateStr, 0, 0, 0, 0);
}

/** UTC instant of 23:59:59.999 Romania time on the given "YYYY-MM-DD" */
export function bucharestDayEndIso(dateStr: string): string {
  return wallClockToUtcIso(dateStr, 23, 59, 59, 999);
}
