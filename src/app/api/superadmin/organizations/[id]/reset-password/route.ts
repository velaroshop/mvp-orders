import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

/**
 * POST /api/superadmin/organizations/[id]/reset-password
 * Reset password for the owner of an organization.
 * Requires superadmin privileges.
 * Body: { newPassword: string }
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
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8 || newPassword.length > 64) {
      return NextResponse.json(
        { error: "Password must be between 8 and 64 characters" },
        { status: 400 }
      );
    }

    // Get the organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, is_superadmin")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find the owner of this organization
    const { data: ownerMember, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .single();

    if (memberError || !ownerMember) {
      return NextResponse.json(
        { error: "Organization owner not found" },
        { status: 404 }
      );
    }

    // Hash the new password and update the user
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ownerMember.user_id);

    if (updateError) {
      console.error("Error resetting password:", updateError);
      return NextResponse.json(
        { error: "Failed to reset password" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Password reset successfully for organization "${organization.name}"`,
    });
  } catch (error) {
    console.error("Error in POST /api/superadmin/organizations/[id]/reset-password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
