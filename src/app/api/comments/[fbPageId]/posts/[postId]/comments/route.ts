import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getPostComments } from "@/lib/meta-comments";

export const dynamic = "force-dynamic";

/**
 * GET /api/comments/[fbPageId]/posts/[postId]/comments
 * Fetch comments for a specific post via Meta Graph API
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fbPageId: string; postId: string }> }
) {
  const { fbPageId, postId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Get the page credentials from DB
    const { data: page, error: pageError } = await supabaseAdmin
      .from("facebook_pages")
      .select("page_access_token, is_active")
      .eq("id", fbPageId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Facebook page not found" }, { status: 404 });
    }

    if (!page.is_active) {
      return NextResponse.json({ error: "Facebook page is inactive" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 50);

    const result = await getPostComments(postId, page.page_access_token, limit, after);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Comments] Error fetching comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
