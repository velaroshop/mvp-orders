import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const currentUserId = (session.user as any).id;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Check if current user is owner
    const { data: currentMember, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", activeOrganizationId)
      .eq("user_id", currentUserId)
      .single();

    if (memberError || !currentMember || currentMember.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can manage users" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean value" },
        { status: 400 }
      );
    }

    // Get the member to check if it exists and is not an owner
    const { data: member, error: fetchError } = await supabaseAdmin
      .from("organization_members")
      .select("*")
      .eq("id", id)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Don't allow deactivating owners
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot deactivate owner accounts" },
        { status: 400 }
      );
    }

    // Update the member's active status
    const { error: updateError } = await supabaseAdmin
      .from("organization_members")
      .update({ is_active: isActive })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating member status:", updateError);
      return NextResponse.json(
        { error: "Failed to update member status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Error in PUT /api/team/members/[id]/toggle-active:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
