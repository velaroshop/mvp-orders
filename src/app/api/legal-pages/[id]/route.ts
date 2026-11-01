import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { refreshPublicPages } from "@/lib/revalidate-public";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { parseBackground, parseBlocksInput, parseSlug, parseTitle } from "@/lib/own-page-input";

const COLUMNS = "id, slug, title, background, blocks, status, updated_at";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

const refresh = refreshPublicPages;

/** GET /api/legal-pages/[id] */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin.from("legal_pages").select(COLUMNS).eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to load page" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  return NextResponse.json({ page: data });
}

/** PUT /api/legal-pages/[id] - Body: { title?, slug?, background?, blocks?, status? } */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  const { data: existing } = await supabaseAdmin.from("legal_pages").select("id").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) update.title = parseTitle(body.title);
  if (body.background !== undefined) update.background = parseBackground(body.background);
  if (body.slug !== undefined) {
    const slug = parseSlug(body.slug);
    if (!slug) return NextResponse.json({ error: "Slug invalid" }, { status: 400 });
    update.slug = slug;
  }
  if (update.slug) {
    const { data: clash } = await supabaseAdmin.from("landing_page_content").select("id").eq("organization_id", guard.organizationId).eq("slug", update.slug as string).not("domain_id", "is", null).limit(1);
    if (clash?.length) return NextResponse.json({ error: "Acest slug e folosit de o pagină de vânzare pe un domeniu" }, { status: 409 });
  }
  if (body.blocks !== undefined) {
    const parsed = parseBlocksInput(body.blocks);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    update.blocks = parsed.blocks;
  }
  if (body.status !== undefined) {
    if (body.status !== "draft" && body.status !== "published") return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    update.status = body.status;
  }

  const { data, error } = await supabaseAdmin.from("legal_pages").update(update).eq("id", id).eq("organization_id", guard.organizationId).select(COLUMNS).single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Acest slug este deja folosit" }, { status: 409 });
    console.error("[Legal Pages] save failed:", error.message);
    return NextResponse.json({ error: "Failed to save page" }, { status: 500 });
  }
  refresh();
  return NextResponse.json({ page: data });
}

/** DELETE /api/legal-pages/[id] */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("legal_pages").delete().eq("id", id).eq("organization_id", guard.organizationId);
  if (error) return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  refresh();
  return NextResponse.json({ success: true });
}
