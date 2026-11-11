import { missingBillingFields } from "@/lib/billing";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

function text(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function numeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function date(value: unknown): string | null | "invalid" {
  const t = text(value);
  if (t == null) return null;
  return DATE_RE.test(t) ? t : "invalid";
}

/** Validates the fields sent for org_billing; only keys that are present are returned. */
export function parseBillingBody(body: Record<string, any>): { data: Record<string, any> } | { error: string } {
  const data: Record<string, any> = {};

  for (const key of ["company_name", "address", "city", "county", "postal_code", "contact_name", "contact_phone", "notes"]) {
    if (key in body) data[key] = text(body[key]);
  }

  if ("cui" in body) {
    const digits = String(body.cui ?? "").replace(/\D/g, "");
    if (digits && (digits.length < 2 || digits.length > 10)) return { error: "CUI invalid." };
    data.cui = digits || null;
  }

  if ("billing_email" in body) {
    const value = text(body.billing_email);
    if (value) {
      const emails = value.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
      if (emails.length === 0 || emails.some((e) => !EMAIL_RE.test(e))) return { error: "Email de facturare invalid." };
      data.billing_email = emails.join(", ");
    } else {
      data.billing_email = null;
    }
  }

  for (const key of ["is_vat_payer", "billing_enabled", "paused"]) {
    if (key in body) data[key] = !!body[key];
  }

  if ("invoice_plan" in body) {
    if (!["pro", "ultra"].includes(body.invoice_plan)) return { error: "Plan invalid." };
    data.invoice_plan = body.invoice_plan;
  }
  if ("billing_timing" in body) {
    if (!["end", "start"].includes(body.billing_timing)) return { error: "Momentul facturării este invalid." };
    data.billing_timing = body.billing_timing;
  }
  if ("billing_mode" in body) {
    if (body.billing_mode !== "manual") return { error: "Facturarea automată nu este disponibilă încă." };
    data.billing_mode = "manual";
  }
  if ("currency" in body) {
    if (!["RON", "EUR"].includes(body.currency)) return { error: "Moneda este invalidă." };
    data.currency = body.currency;
  }

  if ("monthly_price" in body) {
    const n = numeric(body.monthly_price);
    if (n !== null && (Number.isNaN(n) || n < 0)) return { error: "Prețul lunar este invalid." };
    data.monthly_price = n;
  }
  for (const key of ["discount_percent", "vat_rate"]) {
    if (key in body) {
      const n = numeric(body[key]) ?? 0;
      if (Number.isNaN(n) || n < 0 || n > 100) return { error: `Valoarea pentru ${key === "vat_rate" ? "TVA" : "reducere"} este invalidă.` };
      data[key] = n;
    }
  }

  for (const key of ["billing_start_date", "free_until"]) {
    if (key in body) {
      const d = date(body[key]);
      if (d === "invalid") return { error: "Data este invalidă." };
      data[key] = d;
    }
  }

  if ("billing_day" in body) {
    const n = numeric(body.billing_day);
    if (n !== null && (Number.isNaN(n) || !Number.isInteger(n) || n < 0 || n > 28)) return { error: "Ziua facturării este invalidă." };
    data.billing_day = n;
  }

  return { data };
}

/** Error text when billing cannot be turned on yet, or null when everything needed is filled. */
export function billingEnableError(merged: Record<string, any>): string | null {
  if (!merged.billing_enabled) return null;
  const missing = missingBillingFields(merged);
  return missing.length ? `Pentru a porni facturarea completează: ${missing.join(", ")}.` : null;
}

export { DATE_RE };
