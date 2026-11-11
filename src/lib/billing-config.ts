import type { SmartbillPaymentType } from "@/lib/smartbill";

// Fixed settings of the platform subscription invoices (changed through a deploy)
export const SMARTBILL_SERIES = "EMS";
export const INVOICE_ISSUER_NAME = "Lucian Marculescu"; // printed as "Intocmit de"
export const INVOICE_UNIT = "lună";
export const INTERNAL_ALERT_EMAIL = "contact@jupimedia.ro"; // gets the "invoice overdue" email
export const REPLY_TO_EMAIL = "contact@jupimedia.ro";

// Product lines as they exist in the SmartBill catalog
const PLAN_PRODUCTS: Record<string, { code: string; name: string }> = {
  pro: { code: "ems-pro", name: "Abonament lunar acces platformă [EMS] - [Plan PRO]" },
  ultra: { code: "ems-ultra", name: "Abonament lunar acces platformă [EMS] - [Plan ULTRA]" },
};

export function planProduct(plan: string | null | undefined) {
  return PLAN_PRODUCTS[plan || "pro"] || PLAN_PRODUCTS.pro;
}

/** Payment methods offered in the Billing page -> collection type in SmartBill. */
export function smartbillPaymentType(method: string | null | undefined): SmartbillPaymentType {
  if (method === "Transfer bancar") return "Ordin plata";
  if (method === "Card") return "Card";
  return "Alta incasare";
}
