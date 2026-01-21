import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const activeOrgId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;

    // Only owners can edit team members
    if (activeRole !== "owner") {
      return NextResponse.json(
        { error: "Only owners can edit team members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "store_manager"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'store_manager'" },
        { status: 400 }
      );
    }

    // Get the member to update
    const { data: member, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("*, user:users(*)")
      .eq("id", params.id)
      .eq("organization_id", activeOrgId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Cannot edit owner role
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot edit owner account" },
        { status: 403 }
      );
    }

    // Update user information
    const userUpdate: any = {
      name,
      email,
    };

    // Only update password if provided
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      const passwordHash = await bcrypt.hash(password, 10);
      userUpdate.password_hash = passwordHash;
    }

    const { error: userError } = await supabaseAdmin
      .from("users")
      .update(userUpdate)
      .eq("id", member.user_id);

    if (userError) {
      console.error("Error updating user:", userError);
      return NextResponse.json(
        { error: "Failed to update user information" },
        { status: 500 }
      );
    }

    // Update role in organization_members
    const { error: roleError } = await supabaseAdmin
      .from("organization_members")
      .update({ role })
      .eq("id", params.id);

    if (roleError) {
      console.error("Error updating role:", roleError);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const activeOrgId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;

    // Only owners can delete team members
    if (activeRole !== "owner") {
      return NextResponse.json(
        { error: "Only owners can delete team members" },
        { status: 403 }
      );
    }

    // Get the member to delete
    const { data: member, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("*")
      .eq("id", params.id)
      .eq("organization_id", activeOrgId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Cannot delete owner
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot delete owner account" },
        { status: 403 }
      );
    }

    // Cannot delete yourself
    if (member.user_id === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 403 }
      );
    }

    // Delete the organization member record
    const { error: deleteError } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      console.error("Error deleting member:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete team member" },
        { status: 500 }
      );
    }

    // Note: We're not deleting the user from the users table
    // in case they belong to other organizations
    // The user record will remain but they'll lose access to this organization

    return NextResponse.json({
      success: true,
      message: "Team member deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting team member:", error);
    return NextResponse.json(
      { error: "Failed to delete team member" },
      { status: 500 }
    );
  }
}
