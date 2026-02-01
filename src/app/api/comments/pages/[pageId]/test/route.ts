import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

/**
 * POST /api/comments/pages/[pageId]/test
 * Test connection for a Facebook page - verifies token and permissions.
 * Optionally test a specific post ID.
 * Body: { postId?: string }
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

    const isSuperadminOrg = (session.user as any).isSuperadminOrg;
    if (!isSuperadminOrg) {
      return NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Get page from DB
    const { data: page, error: pageError } = await supabaseAdmin
      .from("facebook_pages")
      .select("page_id, page_access_token")
      .eq("id", pageId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Facebook page not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { postId } = body;

    // If testing a specific post ID, try to fetch its comments
    if (postId) {
      const postUrl = `${META_GRAPH_API}/${postId}/comments?fields=id&limit=1&access_token=${page.page_access_token}`;
      const postRes = await fetch(postUrl);

      if (!postRes.ok) {
        const postErr = await postRes.json();
        const metaError = postErr.error || {};
        return NextResponse.json({
          success: false,
          test: "post",
          error: `(#${metaError.code || "?"}) ${metaError.message || "Failed to access post comments"}`,
          hint: getPostHint(metaError.code, metaError.error_subcode),
        });
      }

      return NextResponse.json({
        success: true,
        test: "post",
        message: "Post is accessible - comments can be fetched",
      });
    }

    // Test 1: Validate token by fetching page info
    const tokenUrl = `${META_GRAPH_API}/${page.page_id}?fields=id,name,access_token&access_token=${page.page_access_token}`;
    const tokenRes = await fetch(tokenUrl);

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.json();
      const metaError = tokenErr.error || {};
      return NextResponse.json({
        success: false,
        test: "token",
        error: `(#${metaError.code || "?"}) ${metaError.message || "Invalid token"}`,
        hint: getTokenHint(metaError.code, metaError.error_subcode),
      });
    }

    const pageData = await tokenRes.json();

    // Test 2: Try to fetch recent posts (proves read access works)
    const postsUrl = `${META_GRAPH_API}/${page.page_id}/posts?fields=id&limit=1&access_token=${page.page_access_token}`;
    const postsRes = await fetch(postsUrl);
    const canReadPosts = postsRes.ok;

    // Test 3: Try to fetch comments on a post (if posts exist)
    let canReadComments = false;
    if (canReadPosts) {
      const postsData = await postsRes.json();
      if (postsData.data && postsData.data.length > 0) {
        const testPostId = postsData.data[0].id;
        const commentsUrl = `${META_GRAPH_API}/${testPostId}/comments?fields=id&limit=1&access_token=${page.page_access_token}`;
        const commentsRes = await fetch(commentsUrl);
        canReadComments = commentsRes.ok;
      } else {
        // No posts to test, assume comments would work if posts work
        canReadComments = true;
      }
    }

    const checks = [
      { name: "Page info", ok: true },
      { name: "Read posts", ok: canReadPosts },
      { name: "Read comments", ok: canReadComments },
    ];

    const allPassed = checks.every((c) => c.ok);
    const failed = checks.filter((c) => !c.ok).map((c) => c.name);

    return NextResponse.json({
      success: allPassed,
      test: "token",
      pageName: pageData.name,
      facebookPageId: pageData.id,
      checks,
      message: allPassed
        ? `Connected to "${pageData.name}" - all checks passed`
        : `Connected to "${pageData.name}" but failed: ${failed.join(", ")}`,
      hint: !allPassed
        ? "The Page Access Token may not have enough permissions. Re-generate it with pages_read_engagement, pages_read_user_content, pages_manage_engagement, pages_manage_metadata."
        : undefined,
    });
  } catch (error: any) {
    console.error("[FB Test] Error testing connection:", error);
    return NextResponse.json(
      { error: error.message || "Test failed" },
      { status: 500 }
    );
  }
}

function getTokenHint(code?: number, subcode?: number): string {
  if (code === 190) {
    if (subcode === 463) return "Token has expired. Generate a new Page Access Token from Facebook Business Settings.";
    if (subcode === 467) return "Token is no longer valid. The user may have changed their password or revoked access.";
    return "Token is invalid. Generate a new Page Access Token.";
  }
  if (code === 200) return "Token doesn't have enough permissions. Re-generate with required permissions.";
  if (code === 4) return "API rate limit reached. Wait a few minutes and try again.";
  return "Check that the Page ID and Access Token are correct.";
}

function getPostHint(code?: number, subcode?: number): string {
  if (code === 200) return "The token doesn't have permission to read this post's comments. Make sure the post belongs to this page, or use the full Post ID format (pageId_postId).";
  if (code === 100) return "Post not found. Check the Post ID format - it should be pageId_postId (e.g. 556795054194964_123456789).";
  if (code === 190) return "Token is invalid or expired. Test the page connection first.";
  return "Check the Post ID format and token permissions.";
}
