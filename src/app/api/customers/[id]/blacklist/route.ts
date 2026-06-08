import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";

/**
 * POST /api/customers/[id]/blacklist - Toggle blacklist status
 * Body: { reason?: string }
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
    const reason = body.reason || null;

    // Fetch current customer
    const { data: customer, error: fetchError } = await supabaseAdmin
      .from("customers")
      .select("id, is_blacklisted, phone")
      .eq("id", customerId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const newBlacklisted = !customer.is_blacklisted;

    // Update blacklist status
    const updateData: Record<string, any> = {
      is_blacklisted: newBlacklisted,
    };

    if (newBlacklisted) {
      updateData.blacklisted_at = new Date().toISOString();
      updateData.blacklisted_reason = reason;
    } else {
      updateData.blacklisted_at = null;
      updateData.blacklisted_reason = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update(updateData)
      .eq("id", customerId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update blacklist status" }, { status: 500 });
    }

    // Audit log
    logAudit({
      organizationId: activeOrganizationId,
      userId: (session.user as any).id,
      userEmail: session.user.email || "",
      entityType: "customer",
      entityId: customerId,
      action: newBlacklisted ? "blacklist" : "unblacklist",
      changes: {
        is_blacklisted: { old: customer.is_blacklisted, new: newBlacklisted },
      },
      metadata: {
        phone: customer.phone,
        reason: reason,
      },
    });

    return NextResponse.json({
      success: true,
      isBlacklisted: newBlacklisted,
    });
  } catch (error) {
    console.error("Error toggling blacklist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
