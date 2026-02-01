import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hideComment, unhideComment } from "@/lib/meta-comments";

/**
 * POST /api/comments/actions/[commentId]/hide
 * Hide or unhide a Facebook comment
 * Body: { fbPageId: string, hide: boolean }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperadminOrg = (session.user as any).isSuperadminOrg;
    if (!isSuperadminOrg) {
      return NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const body = await request.json();
    const { fbPageId, hide } = body;

    if (!fbPageId || hide === undefined) {
      return NextResponse.json(
        { error: "fbPageId and hide are required" },
        { status: 400 }
      );
    }

    // Get page token
    const { data: page, error: pageError } = await supabaseAdmin
      .from("facebook_pages")
      .select("page_access_token")
      .eq("id", fbPageId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Facebook page not found" }, { status: 404 });
    }

    if (hide) {
      await hideComment(commentId, page.page_access_token);
    } else {
      await unhideComment(commentId, page.page_access_token);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Comments] Error hiding/unhiding:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update comment visibility" },
      { status: 500 }
    );
  }
}
