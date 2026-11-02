import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { parseSlug, parseTitle } from "@/lib/own-page-input";
import { starterBlocks } from "@/lib/own-page-starter";
import { findUsableDomain, hasUsableDomain, NEEDS_DOMAIN_MESSAGE } from "@/lib/domain-gate";

/** GET /api/own-pages - own pages of the active organization (superadmin only) */
export async function GET() {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .select("id, slug, title, status, landing_page_id, domain_id, is_home, layout, updated_at")
    .eq("organization_id", guard.organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Own Pages] list failed:", error.message);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
  return NextResponse.json({ pages: data ?? [] });
}

/**
 * POST /api/own-pages - create a draft page on a verified domain. Body: { slug, domainId, title?, landingPageId?, duplicateFrom? }
 * Without a verified domain nothing can be created.
 * - landingPageId: the page starts with a short structure and the order form wired to that landing page
 * - duplicateFrom: id of an own page whose title, background and blocks are copied
 * - neither: an empty page
 */
export async function POST(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  if (!(await hasUsableDomain(guard.organizationId))) return NextResponse.json({ error: NEEDS_DOMAIN_MESSAGE }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const slug = parseSlug(body.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug invalid (litere mici, cifre și cratime, maxim 80)" }, { status: 400 });
  }

  const domain = typeof body.domainId === "string" ? await findUsableDomain(guard.organizationId, body.domainId) : null;
  if (!domain) return NextResponse.json({ error: "Alege un domeniu verificat pentru pagină" }, { status: 400 });
  // On a domain, /<slug> is also where the organization's legal pages live: the two must not share a slug
  const { data: legalClash } = await supabaseAdmin.from("legal_pages").select("id").eq("organization_id", guard.organizationId).eq("slug", slug).maybeSingle();
  if (legalClash) return NextResponse.json({ error: "Există deja o pagină legală cu acest slug" }, { status: 409 });

  let landingPageId: string | null = null;
  let landingInfo: { slug: string; name: string } | null = null;
  if (typeof body.landingPageId === "string" && body.landingPageId) {
    const { data: landing } = await supabaseAdmin
      .from("landing_pages")
      .select("id, slug, name")
      .eq("id", body.landingPageId)
      .eq("organization_id", guard.organizationId)
      .maybeSingle();
    if (!landing) return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    landingPageId = landing.id;
    landingInfo = { slug: landing.slug, name: landing.name };
  }

  const title = parseTitle(body.title) || landingInfo?.name || slug;
  let blocks: unknown[] = [];
  let background = "#ffffff";

  if (typeof body.duplicateFrom === "string" && body.duplicateFrom) {
    const { data: source } = await supabaseAdmin
      .from("landing_page_content")
      .select("blocks, background")
      .eq("id", body.duplicateFrom)
      .eq("organization_id", guard.organizationId)
      .maybeSingle();
    if (!source) return NextResponse.json({ error: "Page to duplicate not found" }, { status: 404 });
    blocks = Array.isArray(source.blocks) ? source.blocks : [];
    background = source.background || background;
  } else if (landingInfo) {
    const { data: org } = await supabaseAdmin.from("organizations").select("slug").eq("id", guard.organizationId).maybeSingle();
    blocks = starterBlocks({ title, landingSlug: landingInfo.slug, orgSlug: org?.slug ?? "" });
  }

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .insert({
      organization_id: guard.organizationId,
      landing_page_id: landingPageId,
      domain_id: domain.id,
      slug,
      title,
      background,
      blocks,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error) {
    // 23505 = unique violation: the slug is unique inside a domain
    if (error.code === "23505") return NextResponse.json({ error: "Acest slug este deja folosit" }, { status: 409 });
    console.error("[Own Pages] create failed:", error.message);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
  return NextResponse.json({ page: data }, { status: 201 });
}
