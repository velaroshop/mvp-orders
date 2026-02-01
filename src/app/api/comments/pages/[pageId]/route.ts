import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/comments/pages/[pageId]
 * Update a Facebook page. Owner only.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    if (userRole !== "owner") {
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const body = await request.json();
    const { pageName, pageAccessToken, isActive } = body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (pageName !== undefined) updateData.page_name = pageName;
    if (pageAccessToken !== undefined) updateData.page_access_token = pageAccessToken;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: updated, error } = await supabaseAdmin
      .from("facebook_pages")
      .update(updateData)
      .eq("id", pageId)
      .eq("organization_id", activeOrganizationId)
      .select("id, page_name, page_id, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to update page: ${error.message}`);
    }

    if (!updated) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page: updated });
  } catch (error) {
    console.error("[FB Pages] Error updating page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments/pages/[pageId]
 * Delete a Facebook page. Owner only.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    if (userRole !== "owner") {
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("facebook_pages")
      .delete()
      .eq("id", pageId)
      .eq("organization_id", activeOrganizationId);

    if (error) {
      throw new Error(`Failed to delete page: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FB Pages] Error deleting page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
