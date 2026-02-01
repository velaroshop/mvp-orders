import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/comments/pages/[pageId]/ads
 * List all ad posts for a Facebook page
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { data: ads, error } = await supabaseAdmin
      .from("facebook_ad_posts")
      .select("id, post_id, post_name, is_active, created_at")
      .eq("facebook_page_id", pageId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ad posts: ${error.message}`);
    }

    return NextResponse.json({ ads: ads || [] });
  } catch (error) {
    console.error("[FB Ads] Error fetching ads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/comments/pages/[pageId]/ads
 * Add a new ad post to a Facebook page. Owner only.
 */
export async function POST(
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
    const { postId, postName } = body;

    if (!postId || !postName) {
      return NextResponse.json(
        { error: "Post ID and name are required" },
        { status: 400 }
      );
    }

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from("facebook_ad_posts")
      .select("id")
      .eq("facebook_page_id", pageId)
      .eq("post_id", postId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This ad post is already configured" },
        { status: 400 }
      );
    }

    const { data: newAd, error } = await supabaseAdmin
      .from("facebook_ad_posts")
      .insert({
        facebook_page_id: pageId,
        post_id: postId,
        post_name: postName,
      })
      .select("id, post_id, post_name, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to create ad post: ${error.message}`);
    }

    return NextResponse.json({ ad: newAd }, { status: 201 });
  } catch (error) {
    console.error("[FB Ads] Error creating ad:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
