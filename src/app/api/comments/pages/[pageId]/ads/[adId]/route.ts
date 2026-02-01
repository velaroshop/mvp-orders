import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/comments/pages/[pageId]/ads/[adId]
 * Update an ad post. Owner only.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ pageId: string; adId: string }> }
) {
  const { pageId, adId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Verify page belongs to org
    const { data: page } = await supabaseAdmin
      .from("facebook_pages")
      .select("id")
      .eq("id", pageId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const body = await request.json();
    const { postName, isActive, adAccount, campaign, adset } = body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (postName !== undefined) updateData.post_name = postName;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (adAccount !== undefined) updateData.ad_account = adAccount;
    if (campaign !== undefined) updateData.campaign = campaign;
    if (adset !== undefined) updateData.adset = adset;

    const { data: updated, error } = await supabaseAdmin
      .from("facebook_ad_posts")
      .update(updateData)
      .eq("id", adId)
      .eq("facebook_page_id", pageId)
      .select("id, post_id, post_name, is_active, ad_account, campaign, adset, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to update ad post: ${error.message}`);
    }

    if (!updated) {
      return NextResponse.json({ error: "Ad post not found" }, { status: 404 });
    }

    return NextResponse.json({ ad: updated });
  } catch (error) {
    console.error("[FB Ads] Error updating ad:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments/pages/[pageId]/ads/[adId]
 * Delete an ad post. Owner only.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ pageId: string; adId: string }> }
) {
  const { pageId, adId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Verify page belongs to org
    const { data: page } = await supabaseAdmin
      .from("facebook_pages")
      .select("id")
      .eq("id", pageId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("facebook_ad_posts")
      .delete()
      .eq("id", adId)
      .eq("facebook_page_id", pageId);

    if (error) {
      throw new Error(`Failed to delete ad post: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FB Ads] Error deleting ad:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
