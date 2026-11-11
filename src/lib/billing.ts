// Billing of organizations: dates, prices and invoice states.
// Dates are plain "YYYY-MM-DD" strings (Romania time), so they compare and sort as text.

export const PAYMENT_TERM_DAYS = 15; // days between issue date and due date
export const BANNER_DAYS_BEFORE_DUE = 5; // the owner sees the banner this many days before the due date

export type InvoiceStatus = "issued" | "paid" | "cancelled";
export type InvoiceState = "paid" | "cancelled" | "overdue" | "due_soon" | "open";

export interface OrgBillingSettings {
  billing_enabled: boolean;
  paused: boolean;
  billing_start_date: string | null;
  billing_day: number | null;
  free_until: string | null;
}

export function todayRo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return formatDate(toUtc(date) + days * 86400000);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

/** Price after the percentage discount, rounded to 2 decimals. */
export function effectivePrice(price: number | null, discountPercent: number | null): number | null {
  if (price == null) return null;
  const discount = discountPercent || 0;
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

export function formatMoney(amount: number, currency = "RON"): string {
  const text = amount.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${text} ${currency === "RON" ? "lei" : currency}`;
}

export function invoiceState(invoice: { status: InvoiceStatus; due_date: string }, today: string): InvoiceState {
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "cancelled") return "cancelled";
  const daysLeft = daysBetween(today, invoice.due_date);
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= BANNER_DAYS_BEFORE_DUE) return "due_soon";
  return "open";
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month is 1-based here
}

/**
 * Next invoicing date, or null when billing is off, paused or not scheduled.
 * Without a fixed day the invoice goes out the day before the start day (start on the 10th -> the 9th,
 * start on the 1st -> last day of the month). Dates before the start date and inside the free period are skipped.
 */
export function nextInvoiceDate(settings: OrgBillingSettings, orgCreatedAt: string, today: string): string | null {
  if (!settings.billing_enabled || settings.paused) return null;

  const startDate = settings.billing_start_date || orgCreatedAt.slice(0, 10);
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const dayRule = settings.billing_day ?? (startDay === 1 ? 0 : startDay - 1); // 0 = last day of month
  const earliest = addDays(startDate, 1);

  let year = startYear;
  let month = startMonth;
  for (let i = 0; i < 120; i++) {
    const lastDay = lastDayOfMonth(year, month);
    const day = dayRule === 0 ? lastDay : Math.min(dayRule, lastDay);
    const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (candidate >= today && candidate >= earliest && (!settings.free_until || candidate > settings.free_until)) {
      return candidate;
    }
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return null;
}

/** Fields that must be filled before billing can be turned on for an organization. */
export function missingBillingFields(b: {
  company_name?: string | null;
  cui?: string | null;
  address?: string | null;
  billing_email?: string | null;
  monthly_price?: number | null;
}): string[] {
  const missing: string[] = [];
  if (!b.company_name?.trim()) missing.push("denumirea firmei");
  if (!b.cui?.trim()) missing.push("CUI");
  if (!b.address?.trim()) missing.push("adresa");
  if (!b.billing_email?.trim()) missing.push("email-ul de facturare");
  if (b.monthly_price == null || !(b.monthly_price > 0)) missing.push("prețul lunar");
  return missing;
}
