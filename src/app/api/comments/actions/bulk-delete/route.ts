import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { deleteComment } from "@/lib/meta-comments";

const MAX_BATCH_SIZE = 20;
const DELAY_MS = 2000;

/**
 * POST /api/comments/actions/bulk-delete
 * Delete multiple comments with rate limiting.
 * Body: { fbPageId: string, commentIds: string[] }
 * Returns: { deleted: string[], failed: { id: string, error: string }[] }
 */
export async function POST(request: NextRequest) {
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
    const { fbPageId, commentIds } = body;

    if (!fbPageId || !Array.isArray(commentIds) || commentIds.length === 0) {
      return NextResponse.json({ error: "fbPageId and commentIds are required" }, { status: 400 });
    }

    // Cap at MAX_BATCH_SIZE
    const batch = commentIds.slice(0, MAX_BATCH_SIZE);

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

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (let i = 0; i < batch.length; i++) {
      try {
        await deleteComment(batch[i], page.page_access_token);
        deleted.push(batch[i]);
      } catch (err: any) {
        failed.push({ id: batch[i], error: err.message || "Delete failed" });
      }

      // Delay between deletions (except after last one)
      if (i < batch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    return NextResponse.json({ deleted, failed });
  } catch (error: any) {
    console.error("[Comments] Error bulk deleting:", error);
    return NextResponse.json(
      { error: error.message || "Bulk delete failed" },
      { status: 500 }
    );
  }
}
