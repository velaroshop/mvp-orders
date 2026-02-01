import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/comments/pages
 * List all Facebook pages for the current organization
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const { data: pages, error } = await supabaseAdmin
      .from("facebook_pages")
      .select("id, page_name, page_id, is_active, created_at")
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pages: ${error.message}`);
    }

    return NextResponse.json({ pages: pages || [] });
  } catch (error) {
    console.error("[FB Pages] Error fetching pages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/comments/pages
 * Add a new Facebook page. Owner only.
 */
export async function POST(request: NextRequest) {
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
    const { pageName, pageId, pageAccessToken } = body;

    if (!pageName || !pageId || !pageAccessToken) {
      return NextResponse.json(
        { error: "Page name, page ID, and access token are required" },
        { status: 400 }
      );
    }

    // Check if page ID already exists for this org
    const { data: existing } = await supabaseAdmin
      .from("facebook_pages")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .eq("page_id", pageId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This Facebook page is already configured" },
        { status: 400 }
      );
    }

    const { data: newPage, error } = await supabaseAdmin
      .from("facebook_pages")
      .insert({
        organization_id: activeOrganizationId,
        page_name: pageName,
        page_id: pageId,
        page_access_token: pageAccessToken,
      })
      .select("id, page_name, page_id, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to create page: ${error.message}`);
    }

    return NextResponse.json({ page: newPage }, { status: 201 });
  } catch (error) {
    console.error("[FB Pages] Error creating page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
