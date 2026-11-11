import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { requireSuperadmin, DATE_RE } from "@/lib/billing-server";
import {
  addDays,
  daysBetween,
  defaultInvoicePeriod,
  effectivePrice,
  formatDateRo,
  missingBillingFields,
  nextInvoiceDate,
  PAYMENT_TERM_DAYS,
  todayRo,
} from "@/lib/billing";
import { INVOICE_ISSUER_NAME, INVOICE_UNIT, SMARTBILL_SERIES, planProduct } from "@/lib/billing-config";
import { emailInvoice, recipientsFrom, smartbillClientFrom } from "@/lib/billing-invoices";
import { createInvoice, isSmartbillConfigured, listSeries, SmartbillError } from "@/lib/smartbill";

export const dynamic = "force-dynamic";

async function loadOrg(orgId: string) {
  const [{ data: org }, { data: billing }, { data: invoices }] = await Promise.all([
    supabaseAdmin.from("organizations").select("id, name, created_at").eq("id", orgId).single(),
    supabaseAdmin.from("org_billing").select("*").eq("organization_id", orgId).maybeSingle(),
    supabaseAdmin
      .from("billing_invoices")
      .select("period_start, period_end")
      .eq("organization_id", orgId)
      .neq("status", "cancelled"),
  ]);
  return { org, billing, invoices: invoices || [] };
}

/**
 * GET /api/superadmin/billing/[orgId]/issue - Preview of the invoice that would be issued in SmartBill
 */
export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { orgId } = await params;
    const { org, billing, invoices } = await loadOrg(orgId);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const today = todayRo();
    const missing = missingBillingFields(billing || {});
    const configured = isSmartbillConfigured();
    const warnings: string[] = [];

    let nextNumber: number | null = null;
    let seriesError: string | null = null;
    if (configured && missing.length === 0) {
      try {
        const series = (await listSeries("f")).find((s) => s.name === SMARTBILL_SERIES);
        if (series) nextNumber = series.nextNumber;
        else seriesError = `Seria ${SMARTBILL_SERIES} nu există în SmartBill.`;
      } catch (e) {
        seriesError = e instanceof Error ? e.message : "Nu m-am putut conecta la SmartBill.";
      }
    }

    if (!billing) {
      return NextResponse.json({ configured, missing, series: SMARTBILL_SERIES, nextNumber, seriesError, warnings });
    }

    const lastPeriodEnd = invoices.map((i: any) => i.period_end).filter(Boolean).sort().pop() || null;
    const period = defaultInvoicePeriod(billing, org.created_at, lastPeriodEnd, today);
    const price = effectivePrice(billing.monthly_price != null ? Number(billing.monthly_price) : null, Number(billing.discount_percent) || 0);
    const next = nextInvoiceDate(billing, org.created_at, today);

    if (billing.currency !== "RON") warnings.push("Emiterea în SmartBill este disponibilă doar pentru facturi în RON.");
    if (!billing.billing_enabled) warnings.push("Facturarea este oprită pentru această organizație.");
    if (billing.paused) warnings.push("Facturarea este în pauză.");
    if (billing.free_until && today <= billing.free_until) warnings.push(`Organizația are perioadă gratuită până la ${formatDateRo(billing.free_until)}.`);
    if (next && next !== today) warnings.push(`Următoarea factură este programată pe ${formatDateRo(next)}.`);
    const periodDays = daysBetween(period.start, period.end) + 1;
    if (periodDays < 25 || periodDays > 35) {
      warnings.push(`Perioada are ${periodDays} ${periodDays === 1 ? "zi" : "zile"}. Verifică perioada și suma înainte de emitere.`);
    }

    const product = planProduct(billing.invoice_plan);
    return NextResponse.json({
      configured,
      missing,
      series: SMARTBILL_SERIES,
      nextNumber,
      seriesError,
      warnings,
      today,
      client: { name: billing.company_name, cui: billing.cui, isVatPayer: billing.is_vat_payer, address: billing.address, city: billing.city, county: billing.county },
      product: { code: product.code, name: product.name, unit: INVOICE_UNIT },
      emailTo: recipientsFrom(billing.billing_email),
      defaults: {
        issue_date: today,
        period_start: period.start,
        period_end: period.end,
        amount: price,
        due_date: addDays(today, PAYMENT_TERM_DAYS),
        currency: billing.currency,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/superadmin/billing/[orgId]/issue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/billing/[orgId]/issue - Issue the invoice in SmartBill and record it
 * Body: { issue_date, period_start, period_end, amount, due_date?, send_email? }
 */
export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { orgId } = await params;
    const body = await request.json().catch(() => ({}));

    const issueDate = String(body.issue_date || "");
    const periodStart = String(body.period_start || "");
    const periodEnd = String(body.period_end || "");
    const dueDate = body.due_date ? String(body.due_date) : addDays(issueDate, PAYMENT_TERM_DAYS);
    const amount = Number(body.amount);
    if (![issueDate, periodStart, periodEnd, dueDate].every((d) => DATE_RE.test(d))) {
      return NextResponse.json({ error: "Datele sunt invalide." }, { status: 400 });
    }
    if (periodEnd < periodStart) {
      return NextResponse.json({ error: "Sfârșitul perioadei este înaintea începutului." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Suma facturii este invalidă." }, { status: 400 });
    }

    if (!isSmartbillConfigured()) {
      return NextResponse.json({ error: "SmartBill nu este configurat." }, { status: 400 });
    }

    const { org, billing } = await loadOrg(orgId);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    const missing = missingBillingFields(billing || {});
    if (!billing || missing.length > 0) {
      return NextResponse.json({ error: `Completează datele de facturare: ${missing.join(", ")}.` }, { status: 400 });
    }
    if (billing.currency !== "RON") {
      return NextResponse.json({ error: "Emiterea în SmartBill este disponibilă doar pentru facturi în RON." }, { status: 400 });
    }

    // One invoice per period: checked before anything is issued in SmartBill
    const { data: duplicate } = await supabaseAdmin
      .from("billing_invoices")
      .select("id")
      .eq("organization_id", orgId)
      .eq("period_start", periodStart)
      .neq("status", "cancelled")
      .limit(1);
    if (duplicate && duplicate.length > 0) {
      return NextResponse.json({ error: "Există deja o factură pentru această perioadă." }, { status: 409 });
    }

    const product = planProduct(billing.invoice_plan);
    let issued;
    try {
      issued = await createInvoice({
        series: SMARTBILL_SERIES,
        client: smartbillClientFrom(billing),
        issueDate,
        dueDate,
        currency: "RON",
        productName: product.name,
        productCode: product.code,
        unit: INVOICE_UNIT,
        quantity: 1,
        price: amount,
        mentions: `Perioada ${formatDateRo(periodStart)} - ${formatDateRo(periodEnd)}`,
        issuerName: INVOICE_ISSUER_NAME,
      });
    } catch (e) {
      const message = e instanceof SmartbillError ? e.message : "Nu s-a putut emite factura în SmartBill.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const row = {
      organization_id: orgId,
      series: issued.series,
      number: issued.number,
      period_start: periodStart,
      period_end: periodEnd,
      amount,
      currency: "RON",
      issued_at: issueDate,
      due_date: dueDate,
      source: "smartbill",
      external_id: `${issued.series}${issued.number}`,
    };
    let inserted: any = null;
    for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
      const { data, error } = await supabaseAdmin.from("billing_invoices").insert(row).select().single();
      if (!error) inserted = data;
      else console.error("[Billing] Failed to record the issued invoice:", error.message, row);
    }
    if (!inserted) {
      // The invoice exists in SmartBill but not here: say exactly which one so it can be reconciled
      return NextResponse.json(
        { error: `Factura ${issued.series}${issued.number} a fost emisă în SmartBill, dar nu s-a putut salva aici. Adaug-o manual cu aceeași serie și număr.` },
        { status: 500 }
      );
    }

    logAudit({
      organizationId: auth.activeOrganizationId,
      userId: auth.user.id,
      userEmail: auth.user.email || "",
      entityType: "billing",
      entityId: orgId,
      action: "create",
      metadata: { organization: org.name, invoice: row.external_id, amount, source: "smartbill" },
    });

    let email: { ok: boolean; error?: string } | null = null;
    if (body.send_email) email = await emailInvoice(inserted.id);

    return NextResponse.json({
      success: true,
      invoice: { ...inserted, amount: Number(inserted.amount) },
      email,
    });
  } catch (error) {
    console.error("Error in POST /api/superadmin/billing/[orgId]/issue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
