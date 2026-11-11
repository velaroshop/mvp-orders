import { supabaseAdmin } from "@/lib/supabase";
import { formatDateRo, formatMoney } from "@/lib/billing";
import { REPLY_TO_EMAIL, smartbillPaymentType } from "@/lib/billing-config";
import { sendInvoiceEmail } from "@/lib/email";
import { getInvoicePdf, getPaymentStatus, registerPayment, type SmartbillClient } from "@/lib/smartbill";

export function smartbillClientFrom(billing: any): SmartbillClient {
  const cui = String(billing.cui || "");
  return {
    name: billing.company_name,
    vatCode: billing.is_vat_payer && cui ? `RO${cui}` : cui,
    isTaxPayer: !!billing.is_vat_payer,
    address: billing.address || "",
    city: billing.city || "",
    county: billing.county || "",
    country: "Romania",
    email: String(billing.billing_email || "").split(",")[0].trim(),
  };
}

export function recipientsFrom(billingEmail: string | null | undefined): string[] {
  return String(billingEmail || "")
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Sends the invoice email (PDF attached) for an invoice issued in SmartBill and records when it was sent. */
export async function emailInvoice(invoiceId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: invoice } = await supabaseAdmin.from("billing_invoices").select("*").eq("id", invoiceId).single();
    if (!invoice) return { ok: false, error: "Factura nu a fost găsită." };
    if (invoice.source !== "smartbill" || !invoice.series || !invoice.number) {
      return { ok: false, error: "Emailul se poate trimite doar pentru facturi emise în SmartBill." };
    }

    const { data: billing } = await supabaseAdmin
      .from("org_billing")
      .select("*")
      .eq("organization_id", invoice.organization_id)
      .maybeSingle();
    const to = recipientsFrom(billing?.billing_email);
    if (!billing || to.length === 0) return { ok: false, error: "Organizația nu are email de facturare." };

    const pdf = await getInvoicePdf(invoice.series, invoice.number);
    const result = await sendInvoiceEmail({
      to,
      replyTo: REPLY_TO_EMAIL,
      recipientName: billing.contact_name || billing.company_name || "",
      invoiceNumber: `${invoice.series}${invoice.number}`,
      planLabel: String(billing.invoice_plan || "pro").toUpperCase(),
      periodStart: invoice.period_start ? formatDateRo(invoice.period_start) : "—",
      periodEnd: invoice.period_end ? formatDateRo(invoice.period_end) : "—",
      amountText: formatMoney(Number(invoice.amount), invoice.currency),
      dueDate: formatDateRo(invoice.due_date),
      pdf,
    });
    if (!result.ok) return result;

    const { error } = await supabaseAdmin
      .from("billing_invoices")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", invoiceId);
    if (error) console.warn("[Billing] Could not record emailed_at:", error.message);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Eroare la trimiterea emailului." };
  }
}

/**
 * Registers the collection of an invoice in SmartBill. Skips it when SmartBill already shows the invoice as paid,
 * so a payment recorded there first is never duplicated.
 */
export async function collectInSmartbill(invoice: any, billing: any, paidAt: string, method: string | null): Promise<void> {
  const status = await getPaymentStatus(invoice.series, invoice.number);
  if (status.isPaid) return;
  await registerPayment({
    client: smartbillClientFrom(billing),
    invoiceSeries: invoice.series,
    invoiceNumber: invoice.number,
    amount: status.unpaid > 0 ? status.unpaid : Number(invoice.amount),
    currency: invoice.currency,
    date: paidAt,
    type: smartbillPaymentType(method),
  });
}
