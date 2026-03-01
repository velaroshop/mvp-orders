import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/superadmin/organizations/[id]/update-plan - Update organization plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;

    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json(
        { error: "Access denied. Superadmin privileges required." },
        { status: 403 }
      );
    }

    const { id: organizationId } = await params;
    const body = await request.json();
    const { plan } = body;

    if (!plan || (plan !== "basic" && plan !== "pro")) {
      return NextResponse.json(
        { error: "Plan must be 'basic' or 'pro'" },
        { status: 400 }
      );
    }

    const { data: organization, error: fetchError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, is_superadmin")
      .eq("id", organizationId)
      .single();

    if (fetchError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Superadmin organizations are always pro
    if (organization.is_superadmin && plan !== "pro") {
      return NextResponse.json(
        { error: "Superadmin organizations must remain on the PRO plan" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("id", organizationId);

    if (updateError) {
      console.error("Error updating organization plan:", updateError);
      return NextResponse.json(
        { error: "Failed to update plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Plan updated to ${plan.toUpperCase()} for ${organization.name}`,
    });
  } catch (error) {
    console.error("Error in POST /api/superadmin/organizations/[id]/update-plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
