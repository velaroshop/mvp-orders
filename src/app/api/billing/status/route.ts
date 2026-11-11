import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/billing-server";
import { addDays, BANNER_DAYS_BEFORE_DUE, daysBetween, nextInvoiceDate, todayRo } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/status - What the top banner and the sidebar show for the current user
 *  - admin: superadmin owners see organizations with invoices past the due date
 *  - owner: the owner of an organization sees its own invoice that is due soon or overdue, and the next invoice date
 *  - everyone: the legal name and CUI of the active organization from its billing data, when there is one
 * Returns an empty object when there is nothing to show (or the billing tables do not exist yet).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isOwner = user.activeRole === "owner";
    const orgId = user.activeOrganizationId as string | undefined;
    const today = todayRo();
    const result: Record<string, any> = {};

    // The company's legal name and CUI as verified in Billing (the registration values may be placeholders)
    if (orgId) {
      const { data: profile } = await supabaseAdmin
        .from("org_billing")
        .select("company_name, cui, is_vat_payer")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (profile?.cui) result.cui = profile.is_vat_payer ? `RO${profile.cui}` : String(profile.cui);
      if (profile?.company_name) result.companyName = profile.company_name;
    }

    if (isOwner && user.isSuperadminOrg) {
      const { data: overdue, error } = await supabaseAdmin
        .from("billing_invoices")
        .select("id, organization_id, series, number, amount, currency, due_date")
        .eq("status", "issued")
        .lt("due_date", today)
        .order("due_date", { ascending: true });
      if (isMissingTable(error)) return NextResponse.json({});
      if (!error && overdue && overdue.length > 0) {
        const orgIds = [...new Set(overdue.map((i) => i.organization_id))];
        const { data: orgs } = await supabaseAdmin.from("organizations").select("id, name").in("id", orgIds);
        const names = new Map((orgs || []).map((o: any) => [o.id, o.name]));
        result.admin = {
          overdueCount: overdue.length,
          items: overdue.slice(0, 5).map((i) => ({
            organizationId: i.organization_id,
            organizationName: names.get(i.organization_id) || "—",
            invoice: `${i.series || ""}${i.number || ""}`,
            amount: Number(i.amount),
            currency: i.currency,
            daysLate: daysBetween(i.due_date, today),
          })),
        };
      }
    }

    if (isOwner && orgId) {
      const { data: open, error } = await supabaseAdmin
        .from("billing_invoices")
        .select("series, number, amount, currency, due_date")
        .eq("organization_id", orgId)
        .eq("status", "issued")
        .lte("due_date", addDays(today, BANNER_DAYS_BEFORE_DUE))
        .order("due_date", { ascending: true })
        .limit(1);
      if (isMissingTable(error)) return NextResponse.json({});
      if (!error && open && open.length > 0) {
        const inv = open[0];
        const daysLeft = daysBetween(today, inv.due_date);
        result.owner = {
          invoice: `${inv.series || ""}${inv.number || ""}`,
          amount: Number(inv.amount),
          currency: inv.currency,
          dueDate: inv.due_date,
          daysLeft,
          overdue: daysLeft < 0,
        };
      }

      const [{ data: billing }, { data: org }] = await Promise.all([
        supabaseAdmin.from("org_billing").select("billing_enabled, paused, billing_start_date, billing_day, free_until").eq("organization_id", orgId).maybeSingle(),
        supabaseAdmin.from("organizations").select("created_at").eq("id", orgId).single(),
      ]);
      if (billing && org) {
        result.nextInvoiceDate = nextInvoiceDate(billing as any, org.created_at, today);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/billing/status:", error);
    return NextResponse.json({});
  }
}
