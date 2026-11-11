import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { daysBetween, formatDateRo, formatMoney, todayRo } from "@/lib/billing";
import { INTERNAL_ALERT_EMAIL } from "@/lib/billing-config";
import { sendOverdueInvoicesAlert } from "@/lib/email";
import { getPaymentStatus, isSmartbillConfigured } from "@/lib/smartbill";

export const maxDuration = 120;

/**
 * Daily billing job:
 * 1. Invoices issued in SmartBill take their paid / unpaid status from SmartBill, so a collection recorded there
 *    shows up here without touching the invoice.
 * 2. One internal email for every invoice that went past its due date (sent once per invoice).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = todayRo();
    const results = { checked: 0, updated: 0, notFound: 0, failed: 0, alerted: 0, alertError: null as string | null };

    // 1. Status from SmartBill
    if (isSmartbillConfigured()) {
      const { data: invoices, error } = await supabaseAdmin
        .from("billing_invoices")
        .select("id, series, number, status")
        .eq("source", "smartbill")
        .in("status", ["issued", "paid"]);

      if (error) {
        console.warn("[Cron Billing] Could not load invoices:", error.message);
      } else {
        for (const invoice of invoices || []) {
          results.checked++;
          try {
            const status = await getPaymentStatus(invoice.series, invoice.number);
            const wanted = status.isPaid ? "paid" : "issued";
            if (wanted !== invoice.status) {
              const { error: updateError } = await supabaseAdmin
                .from("billing_invoices")
                .update(
                  wanted === "paid"
                    ? { status: "paid", paid_at: today, paid_method: "SmartBill", updated_at: new Date().toISOString() }
                    : { status: "issued", paid_at: null, paid_method: null, updated_at: new Date().toISOString() }
                )
                .eq("id", invoice.id);
              if (updateError) throw updateError;
              results.updated++;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (/nu a fost gasita/i.test(message)) results.notFound++;
            else results.failed++;
            console.warn(`[Cron Billing] ${invoice.series}${invoice.number}:`, message);
          }
          await new Promise((resolve) => setTimeout(resolve, 400)); // SmartBill rate limit
        }
      }
    }

    // 2. Overdue alert (internal)
    const { data: overdue, error: overdueError } = await supabaseAdmin
      .from("billing_invoices")
      .select("id, organization_id, series, number, amount, currency, due_date")
      .eq("status", "issued")
      .lt("due_date", today)
      .is("overdue_notified_at", null)
      .order("due_date", { ascending: true });

    if (overdueError) {
      results.alertError = overdueError.message; // e.g. migration 111 not run yet
      console.warn("[Cron Billing] Overdue lookup failed:", overdueError.message);
    } else if (overdue && overdue.length > 0) {
      const orgIds = [...new Set(overdue.map((i) => i.organization_id))];
      const { data: orgs } = await supabaseAdmin.from("organizations").select("id, name").in("id", orgIds);
      const names = new Map((orgs || []).map((o: any) => [o.id, o.name]));

      const sent = await sendOverdueInvoicesAlert(
        INTERNAL_ALERT_EMAIL,
        overdue.map((i) => ({
          organizationName: names.get(i.organization_id) || "—",
          invoice: `${i.series || ""}${i.number || ""}`,
          amountText: formatMoney(Number(i.amount), i.currency),
          dueDate: formatDateRo(i.due_date),
          daysLate: daysBetween(i.due_date, today),
        }))
      );

      if (sent.ok) {
        await supabaseAdmin
          .from("billing_invoices")
          .update({ overdue_notified_at: new Date().toISOString() })
          .in("id", overdue.map((i) => i.id));
        results.alerted = overdue.length;
      } else {
        results.alertError = sent.error || "Email failed";
        console.warn("[Cron Billing] Overdue email failed:", sent.error);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Cron Billing] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
