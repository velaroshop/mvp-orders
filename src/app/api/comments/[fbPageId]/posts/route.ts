import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getPagePosts } from "@/lib/meta-comments";

export const dynamic = "force-dynamic";

/**
 * GET /api/comments/[fbPageId]/posts
 * Fetch posts from a Facebook page via Meta Graph API
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fbPageId: string }> }
) {
  const { fbPageId } = await context.params;
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
      .select("page_id, page_access_token, is_active")
      .eq("id", fbPageId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Facebook page not found" }, { status: 404 });
    }

    if (!page.is_active) {
      return NextResponse.json({ error: "Facebook page is inactive" }, { status: 400 });
    }

    const posts = await getPagePosts(page.page_id, page.page_access_token);

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error("[Comments] Error fetching posts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
