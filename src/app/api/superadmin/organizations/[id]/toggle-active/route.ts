import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/superadmin/organizations/[id]/toggle-active - Toggle organization active status
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

    // Check if user is OWNER and from a superadmin organization
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json(
        { error: "Access denied. Superadmin privileges required." },
        { status: 403 }
      );
    }

    const { id: organizationId } = await params;

    // Get current organization state
    const { data: organization, error: fetchError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, is_active, is_superadmin")
      .eq("id", organizationId)
      .single();

    if (fetchError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Prevent deactivating a superadmin organization
    if (organization.is_superadmin && organization.is_active) {
      return NextResponse.json(
        { error: "Cannot deactivate a superadmin organization" },
        { status: 400 }
      );
    }

    // Toggle the is_active status
    const newActiveStatus = !organization.is_active;

    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({
        is_active: newActiveStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating organization:", updateError);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Organization ${newActiveStatus ? "activated" : "deactivated"} successfully`,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        isActive: updatedOrg.is_active,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/superadmin/organizations/[id]/toggle-active:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
