import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { requireSuperadmin, isMissingTable, parseBillingBody, billingEnableError } from "@/lib/billing-server";
import { effectivePrice, nextInvoiceDate, todayRo } from "@/lib/billing";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  company_name: null,
  cui: null,
  is_vat_payer: false,
  address: null,
  city: null,
  county: null,
  postal_code: null,
  billing_email: null,
  contact_name: null,
  contact_phone: null,
  invoice_plan: "pro",
  monthly_price: null,
  discount_percent: 0,
  vat_rate: 0,
  currency: "RON",
  billing_enabled: false,
  billing_mode: "manual",
  billing_timing: "end",
  billing_start_date: null,
  billing_day: null,
  free_until: null,
  paused: false,
  notes: null,
};

/**
 * GET /api/superadmin/billing/[orgId] - Billing data and invoices of one organization
 */
export async function GET(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { orgId } = await params;

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, plan, is_active, is_pending, created_at, cui")
      .eq("id", orgId)
      .single();
    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const [billingResult, invoicesResult] = await Promise.all([
      supabaseAdmin.from("org_billing").select("*").eq("organization_id", orgId).maybeSingle(),
      supabaseAdmin
        .from("billing_invoices")
        .select("*")
        .eq("organization_id", orgId)
        .order("issued_at", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (isMissingTable(billingResult.error) || isMissingTable(invoicesResult.error)) {
      return NextResponse.json({ needsMigration: true }, { status: 200 });
    }
    if (billingResult.error || invoicesResult.error) {
      throw new Error(billingResult.error?.message || invoicesResult.error?.message);
    }

    const billing: any = { ...DEFAULTS, ...(billingResult.data || {}) };
    // Prefill from the registration data the first time
    if (!billingResult.data) {
      billing.company_name = org.name;
      billing.cui = org.cui ? String(org.cui).replace(/\D/g, "") || null : null;
    }

    const today = todayRo();
    return NextResponse.json({
      needsMigration: false,
      organization: { id: org.id, name: org.name, plan: org.plan || "pro", isActive: org.is_active, isPending: org.is_pending, createdAt: org.created_at },
      billing,
      saved: !!billingResult.data,
      finalPrice: effectivePrice(
        billing.monthly_price != null ? Number(billing.monthly_price) : null,
        Number(billing.discount_percent) || 0
      ),
      nextInvoiceDate: nextInvoiceDate(billing, org.created_at, today),
      today,
      invoices: (invoicesResult.data || []).map((inv: any) => ({ ...inv, amount: Number(inv.amount) })),
    });
  } catch (error) {
    console.error("Error in GET /api/superadmin/billing/[orgId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/superadmin/billing/[orgId] - Save billing data and settings
 */
export async function PUT(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { orgId } = await params;
    const body = await request.json().catch(() => ({}));

    const parsed = parseBillingBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data: org } = await supabaseAdmin.from("organizations").select("id, name").eq("id", orgId).single();
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("org_billing")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (isMissingTable(existingError)) {
      return NextResponse.json({ error: "Migrarea 110 nu a fost rulată." }, { status: 400 });
    }

    const merged: any = { ...DEFAULTS, ...(existing || {}), ...parsed.data };
    const enableError = billingEnableError(merged);
    if (enableError) {
      return NextResponse.json({ error: enableError }, { status: 400 });
    }

    const { data: saved, error } = await supabaseAdmin
      .from("org_billing")
      .upsert({ ...parsed.data, organization_id: orgId, updated_at: new Date().toISOString() }, { onConflict: "organization_id" })
      .select()
      .single();
    if (error) {
      console.error("Error saving org_billing:", error);
      return NextResponse.json({ error: "Nu s-au putut salva datele." }, { status: 500 });
    }

    const changes: Record<string, { old: any; new: any }> = {};
    for (const key of Object.keys(parsed.data)) {
      const before = (existing as any)?.[key] ?? (DEFAULTS as any)[key] ?? null;
      if (String(before) !== String((saved as any)[key] ?? null)) changes[key] = { old: before, new: (saved as any)[key] };
    }
    if (Object.keys(changes).length > 0) {
      logAudit({
        organizationId: auth.activeOrganizationId,
        userId: auth.user.id,
        userEmail: auth.user.email || "",
        entityType: "billing",
        entityId: orgId,
        action: "update",
        changes,
        metadata: { organization: org.name },
      });
    }

    return NextResponse.json({ success: true, billing: saved });
  } catch (error) {
    console.error("Error in PUT /api/superadmin/billing/[orgId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
