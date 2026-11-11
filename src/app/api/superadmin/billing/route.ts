import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin, isMissingTable } from "@/lib/billing-server";
import {
  daysBetween,
  effectivePrice,
  invoiceState,
  nextInvoiceDate,
  todayRo,
  type InvoiceStatus,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * GET /api/superadmin/billing - Billing overview of all organizations (superadmin only)
 */
export async function GET() {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const today = todayRo();
    const month = today.slice(0, 7);

    const [orgsResult, billingResult, invoicesResult] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, name, is_active, is_pending, is_superadmin, plan, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("org_billing").select("*"),
      supabaseAdmin
        .from("billing_invoices")
        .select("id, organization_id, series, number, amount, currency, issued_at, due_date, status, paid_at")
        .neq("status", "cancelled")
        .order("issued_at", { ascending: false }),
    ]);

    if (isMissingTable(billingResult.error) || isMissingTable(invoicesResult.error)) {
      return NextResponse.json({ needsMigration: true, organizations: [], summary: null });
    }
    if (orgsResult.error || billingResult.error || invoicesResult.error) {
      throw new Error(
        orgsResult.error?.message || billingResult.error?.message || invoicesResult.error?.message
      );
    }

    const billingByOrg = new Map((billingResult.data || []).map((b: any) => [b.organization_id, b]));
    const invoicesByOrg = new Map<string, any[]>();
    for (const inv of invoicesResult.data || []) {
      const list = invoicesByOrg.get(inv.organization_id) || [];
      list.push(inv);
      invoicesByOrg.set(inv.organization_id, list);
    }

    let overdueCount = 0;
    let overdueSum = 0;
    let outstandingSum = 0;
    let paidThisMonth = 0;
    let recurring = 0;

    const organizations = (orgsResult.data || [])
      .filter((org: any) => !org.is_superadmin)
      .map((org: any) => {
        const billing: any = billingByOrg.get(org.id) || null;
        const invoices = invoicesByOrg.get(org.id) || [];

        let worstOverdueDays = 0;
        let soonestDueDays: number | null = null;
        let outstanding = 0;
        for (const inv of invoices) {
          const amount = Number(inv.amount) || 0;
          if (inv.status === "paid" && inv.paid_at && String(inv.paid_at).startsWith(month)) paidThisMonth += amount;
          if (inv.status !== "issued") continue;
          outstanding += amount;
          const state = invoiceState(inv, today);
          const daysLeft = daysBetween(today, inv.due_date);
          if (state === "overdue") {
            overdueCount++;
            overdueSum += amount;
            worstOverdueDays = Math.max(worstOverdueDays, -daysLeft);
          } else if (soonestDueDays === null || daysLeft < soonestDueDays) {
            soonestDueDays = daysLeft;
          }
        }
        outstandingSum += outstanding;

        const price = billing ? effectivePrice(billing.monthly_price != null ? Number(billing.monthly_price) : null, Number(billing.discount_percent) || 0) : null;
        const inFreePeriod = !!billing?.free_until && billing.free_until >= today;
        if (billing?.billing_enabled && !billing.paused && !inFreePeriod && price) recurring += price;

        const paymentState =
          worstOverdueDays > 0 ? "overdue" : soonestDueDays !== null && soonestDueDays <= 5 ? "due_soon" : invoices.length ? "ok" : "none";

        return {
          id: org.id,
          name: org.name,
          isActive: org.is_active,
          isPending: org.is_pending,
          plan: org.plan || "pro",
          invoicePlan: billing?.invoice_plan || "pro",
          hasBilling: !!billing,
          billingEnabled: !!billing?.billing_enabled,
          paused: !!billing?.paused,
          freeUntil: billing?.free_until || null,
          currency: billing?.currency || "RON",
          price,
          discountPercent: billing ? Number(billing.discount_percent) || 0 : 0,
          nextInvoiceDate: billing
            ? nextInvoiceDate(
                {
                  billing_enabled: billing.billing_enabled,
                  paused: billing.paused,
                  billing_start_date: billing.billing_start_date,
                  billing_day: billing.billing_day,
                  free_until: billing.free_until,
                },
                org.created_at,
                today
              )
            : null,
          lastInvoice: invoices[0]
            ? {
                series: invoices[0].series,
                number: invoices[0].number,
                amount: Number(invoices[0].amount),
                currency: invoices[0].currency,
                issuedAt: invoices[0].issued_at,
                status: invoices[0].status as InvoiceStatus,
              }
            : null,
          paymentState,
          overdueDays: worstOverdueDays,
          daysToDue: soonestDueDays,
          outstanding,
        };
      });

    return NextResponse.json({
      needsMigration: false,
      organizations,
      summary: {
        overdueCount,
        overdueSum,
        outstandingSum,
        paidThisMonth,
        recurring,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/superadmin/billing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
