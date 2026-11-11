import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { requireSuperadmin, DATE_RE } from "@/lib/billing-server";
import { todayRo } from "@/lib/billing";

/**
 * PATCH /api/superadmin/billing/invoices/[id]
 * Body: { action: "pay" | "unpay" | "cancel", paid_at?, paid_method? }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    if (!["pay", "unpay", "cancel"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: invoice } = await supabaseAdmin.from("billing_invoices").select("*").eq("id", id).single();
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let update: Record<string, any>;
    if (action === "pay") {
      if (invoice.status === "cancelled") {
        return NextResponse.json({ error: "Factura este anulată." }, { status: 400 });
      }
      const paidAt = body.paid_at ? String(body.paid_at) : todayRo();
      if (!DATE_RE.test(paidAt)) {
        return NextResponse.json({ error: "Data plății este invalidă." }, { status: 400 });
      }
      update = { status: "paid", paid_at: paidAt, paid_method: body.paid_method ? String(body.paid_method).trim() : null };
    } else if (action === "unpay") {
      if (invoice.status !== "paid") {
        return NextResponse.json({ error: "Factura nu este marcată ca achitată." }, { status: 400 });
      }
      update = { status: "issued", paid_at: null, paid_method: null };
    } else {
      if (invoice.status === "paid") {
        return NextResponse.json({ error: "Factura achitată nu poate fi anulată. Marcheaz-o mai întâi ca neachitată." }, { status: 400 });
      }
      update = { status: "cancelled" };
    }

    const { data: updated, error } = await supabaseAdmin
      .from("billing_invoices")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Error updating billing invoice:", error);
      return NextResponse.json({ error: "Nu s-a putut actualiza factura." }, { status: 500 });
    }

    logAudit({
      organizationId: auth.activeOrganizationId,
      userId: auth.user.id,
      userEmail: auth.user.email || "",
      entityType: "billing",
      entityId: invoice.organization_id,
      action: "status_change",
      changes: { status: { old: invoice.status, new: updated.status } },
      metadata: { invoice: `${invoice.series || ""}${invoice.number || ""}`, action },
    });

    return NextResponse.json({ success: true, invoice: { ...updated, amount: Number(updated.amount) } });
  } catch (error) {
    console.error("Error in PATCH /api/superadmin/billing/invoices/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/superadmin/billing/invoices/[id] - Remove a record entered by hand (not invoices from the invoicing app)
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { data: invoice } = await supabaseAdmin.from("billing_invoices").select("*").eq("id", id).single();
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.source !== "manual") {
      return NextResponse.json({ error: "Doar înregistrările introduse manual pot fi șterse. Anulează factura." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("billing_invoices").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Nu s-a putut șterge." }, { status: 500 });
    }

    logAudit({
      organizationId: auth.activeOrganizationId,
      userId: auth.user.id,
      userEmail: auth.user.email || "",
      entityType: "billing",
      entityId: invoice.organization_id,
      action: "delete",
      metadata: { invoice: `${invoice.series || ""}${invoice.number || ""}`, amount: Number(invoice.amount) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/superadmin/billing/invoices/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
