import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { recalcCustomerLoyalty } from "@/lib/loyalty";

/**
 * POST /api/customers/[id]/loyal - Set the manual loyalty override
 * Body: { action: "mark" | "unmark" | "auto" }
 *  - mark:   loyal by hand (stays loyal even if the rule is not met)
 *  - unmark: removed from loyal by hand (stays out even if the rule is met)
 *  - auto:   back to the automatic rule
 * A blacklisted customer is never loyal.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const { id: customerId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    if (!["mark", "unmark", "auto"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: customer, error: fetchError } = await supabaseAdmin
      .from("customers")
      .select("id, phone, is_loyal, loyal_override, is_blacklisted")
      .eq("id", customerId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (action === "mark" && customer.is_blacklisted) {
      return NextResponse.json(
        { error: "Clientul este pe blacklist. Scoate-l mai întâi de pe blacklist." },
        { status: 400 }
      );
    }

    const override = action === "mark" ? true : action === "unmark" ? false : null;
    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update({ loyal_override: override })
      .eq("id", customerId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update loyalty" }, { status: 500 });
    }

    await recalcCustomerLoyalty([customerId]);

    const { data: updated } = await supabaseAdmin
      .from("customers")
      .select("is_loyal, loyal_since, loyal_override, delivered_count, returned_count")
      .eq("id", customerId)
      .single();

    logAudit({
      organizationId: activeOrganizationId,
      userId: (session.user as any).id,
      userEmail: session.user.email || "",
      entityType: "customer",
      entityId: customerId,
      action: "update",
      changes: {
        loyal_override: { old: customer.loyal_override, new: override },
        is_loyal: { old: customer.is_loyal, new: updated?.is_loyal ?? null },
      },
      metadata: { phone: customer.phone },
    });

    return NextResponse.json({
      success: true,
      isLoyal: updated?.is_loyal ?? false,
      loyalSince: updated?.loyal_since ?? null,
      loyalOverride: updated?.loyal_override ?? null,
      deliveredCount: updated?.delivered_count ?? 0,
      returnedCount: updated?.returned_count ?? 0,
    });
  } catch (error) {
    console.error("Error updating loyalty:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
