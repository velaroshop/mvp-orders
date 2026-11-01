import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { parseSlug, parseTitle } from "@/lib/own-page-input";
import { legalBlocks } from "@/lib/own-page-starter";

/** GET /api/legal-pages - legal pages of the active organization (superadmin only) */
export async function GET() {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await supabaseAdmin
    .from("legal_pages")
    .select("id, slug, title, status, updated_at")
    .eq("organization_id", guard.organizationId)
    .order("title", { ascending: true });
  if (error) {
    console.error("[Legal Pages] list failed:", error.message);
    return NextResponse.json({ error: "Failed to load pages" }, { status: 500 });
  }
  return NextResponse.json({ pages: data ?? [] });
}

/** POST /api/legal-pages - create a draft legal page (formatted text + footer). Body: { slug, title } */
export async function POST(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const slug = parseSlug(body.slug);
  if (!slug) return NextResponse.json({ error: "Slug invalid (litere mici, cifre și cratime, maxim 80)" }, { status: 400 });
  const title = parseTitle(body.title) || slug;

  // On a domain, /<slug> is also where its sales pages live: the slug must not be used by one of them
  const { data: clash } = await supabaseAdmin.from("landing_page_content").select("id").eq("organization_id", guard.organizationId).eq("slug", slug).not("domain_id", "is", null).limit(1);
  if (clash?.length) return NextResponse.json({ error: "Acest slug e folosit de o pagină de vânzare pe un domeniu" }, { status: 409 });

  const { data, error } = await supabaseAdmin
    .from("legal_pages")
    .insert({ organization_id: guard.organizationId, slug, title, background: "#ffffff", blocks: legalBlocks(title), status: "draft" })
    .select("id, slug")
    .single();
  if (error) {
    // 23505 = unique violation: the slug is unique inside the organization
    if (error.code === "23505") return NextResponse.json({ error: "Acest slug este deja folosit" }, { status: 409 });
    console.error("[Legal Pages] create failed:", error.message);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
  return NextResponse.json({ page: data }, { status: 201 });
}
