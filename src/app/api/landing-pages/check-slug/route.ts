import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/landing-pages/check-slug?slug=...&excludeId=...
 * Checks if a slug is already used anywhere in the application.
 * excludeId: landing page ID to exclude (for edit mode — skip self)
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  const excludeId = searchParams.get("excludeId");

  if (!slug) {
    return NextResponse.json({ available: false, error: "Slug is required" });
  }

  let query = supabaseAdmin
    .from("landing_pages")
    .select("id, name, organizations(name)")
    .eq("slug", slug);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to check slug" }, { status: 500 });
  }

  const taken = data && data.length > 0;

  return NextResponse.json({
    available: !taken,
    usedBy: taken ? (data[0] as any).organizations?.name || "altă organizație" : null,
  });
}
