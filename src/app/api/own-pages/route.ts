import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { parseSlug, parseTitle } from "@/lib/own-page-input";

/** GET /api/own-pages - own pages of the active organization (superadmin only) */
export async function GET() {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .select("id, slug, title, status, landing_page_id, updated_at")
    .eq("organization_id", guard.organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Own Pages] list failed:", error.message);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
  return NextResponse.json({ pages: data ?? [] });
}

/** POST /api/own-pages - create an empty draft page. Body: { slug, title?, landingPageId? } */
export async function POST(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const slug = parseSlug(body.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug invalid (litere mici, cifre și cratime, maxim 80)" }, { status: 400 });
  }

  let landingPageId: string | null = null;
  if (typeof body.landingPageId === "string" && body.landingPageId) {
    const { data: landing } = await supabaseAdmin
      .from("landing_pages")
      .select("id")
      .eq("id", body.landingPageId)
      .eq("organization_id", guard.organizationId)
      .maybeSingle();
    if (!landing) return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    landingPageId = landing.id;
  }

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .insert({
      organization_id: guard.organizationId,
      landing_page_id: landingPageId,
      slug,
      title: parseTitle(body.title) || slug,
      blocks: [],
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error) {
    // 23505 = unique violation: the public address /p/[slug] is global
    if (error.code === "23505") return NextResponse.json({ error: "Acest slug este deja folosit" }, { status: 409 });
    console.error("[Own Pages] create failed:", error.message);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
  return NextResponse.json({ page: data }, { status: 201 });
}
