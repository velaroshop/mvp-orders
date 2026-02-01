import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { replyToComment } from "@/lib/meta-comments";

/**
 * POST /api/comments/actions/[commentId]/reply
 * Reply to a Facebook comment
 * Body: { fbPageId: string, message: string }
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

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const body = await request.json();
    const { fbPageId, message } = body;

    if (!fbPageId || !message) {
      return NextResponse.json(
        { error: "fbPageId and message are required" },
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

    const result = await replyToComment(commentId, page.page_access_token, message);

    return NextResponse.json({ success: true, replyId: result.id });
  } catch (error: any) {
    console.error("[Comments] Error replying:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reply to comment" },
      { status: 500 }
    );
  }
}
