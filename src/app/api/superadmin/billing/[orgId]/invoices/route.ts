import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { requireSuperadmin, isMissingTable, DATE_RE } from "@/lib/billing-server";
import { addDays, PAYMENT_TERM_DAYS } from "@/lib/billing";

/**
 * POST /api/superadmin/billing/[orgId]/invoices - Record an invoice by hand
 * Body: { series?, number?, period_start?, period_end?, amount, issued_at, due_date?, note? }
 */
export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { orgId } = await params;
    const body = await request.json().catch(() => ({}));

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Suma facturii este invalidă." }, { status: 400 });
    }
    const issuedAt = String(body.issued_at || "");
    if (!DATE_RE.test(issuedAt)) {
      return NextResponse.json({ error: "Data emiterii este invalidă." }, { status: 400 });
    }
    const dueDate = body.due_date ? String(body.due_date) : addDays(issuedAt, PAYMENT_TERM_DAYS);
    if (!DATE_RE.test(dueDate)) {
      return NextResponse.json({ error: "Scadența este invalidă." }, { status: 400 });
    }
    const periodStart = body.period_start ? String(body.period_start) : null;
    const periodEnd = body.period_end ? String(body.period_end) : null;
    if ((periodStart && !DATE_RE.test(periodStart)) || (periodEnd && !DATE_RE.test(periodEnd))) {
      return NextResponse.json({ error: "Perioada este invalidă." }, { status: 400 });
    }
    if (periodStart && periodEnd && periodEnd < periodStart) {
      return NextResponse.json({ error: "Sfârșitul perioadei este înaintea începutului." }, { status: 400 });
    }

    const { data: org } = await supabaseAdmin.from("organizations").select("id, name").eq("id", orgId).single();
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: billing } = await supabaseAdmin
      .from("org_billing")
      .select("currency")
      .eq("organization_id", orgId)
      .maybeSingle();

    const { data: invoice, error } = await supabaseAdmin
      .from("billing_invoices")
      .insert({
        organization_id: orgId,
        series: body.series ? String(body.series).trim() : null,
        number: body.number ? String(body.number).trim() : null,
        period_start: periodStart,
        period_end: periodEnd,
        amount,
        currency: billing?.currency || "RON",
        issued_at: issuedAt,
        due_date: dueDate,
        note: body.note ? String(body.note).trim() : null,
        source: "manual",
      })
      .select()
      .single();

    if (isMissingTable(error)) {
      return NextResponse.json({ error: "Migrarea 110 nu a fost rulată." }, { status: 400 });
    }
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Există deja o factură pentru această perioadă." }, { status: 409 });
      }
      console.error("Error creating billing invoice:", error);
      return NextResponse.json({ error: "Nu s-a putut salva factura." }, { status: 500 });
    }

    logAudit({
      organizationId: auth.activeOrganizationId,
      userId: auth.user.id,
      userEmail: auth.user.email || "",
      entityType: "billing",
      entityId: orgId,
      action: "create",
      metadata: { organization: org.name, invoice: `${invoice.series || ""}${invoice.number || ""}`, amount },
    });

    return NextResponse.json({ success: true, invoice: { ...invoice, amount: Number(invoice.amount) } });
  } catch (error) {
    console.error("Error in POST /api/superadmin/billing/[orgId]/invoices:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
