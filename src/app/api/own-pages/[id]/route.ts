import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { parseBackground, parseBlocksInput, parseSlug, parseTitle } from "@/lib/own-page-input";

const COLUMNS = "id, slug, title, background, blocks, status, landing_page_id, updated_at";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/own-pages/[id] */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .select(COLUMNS)
    .eq("id", id)
    .eq("organization_id", guard.organizationId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load page" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  return NextResponse.json({ page: data });
}

/**
 * PUT /api/own-pages/[id] - save. Body: { title?, slug?, background?, blocks?, status? }
 * Publishing/unpublishing is a status change; the public page is refreshed right away.
 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const { data: existing } = await supabaseAdmin
    .from("landing_page_content")
    .select("id, slug")
    .eq("id", id)
    .eq("organization_id", guard.organizationId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) update.title = parseTitle(body.title);
  if (body.background !== undefined) update.background = parseBackground(body.background);

  if (body.slug !== undefined) {
    const slug = parseSlug(body.slug);
    if (!slug) return NextResponse.json({ error: "Slug invalid" }, { status: 400 });
    update.slug = slug;
  }

  if (body.blocks !== undefined) {
    const parsed = parseBlocksInput(body.blocks);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    update.blocks = parsed.blocks;
  }

  if (body.status !== undefined) {
    if (body.status !== "draft" && body.status !== "published") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .update(update)
    .eq("id", id)
    .eq("organization_id", guard.organizationId)
    .select(COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Acest slug este deja folosit" }, { status: 409 });
    console.error("[Own Pages] save failed:", error.message);
    return NextResponse.json({ error: "Failed to save page" }, { status: 500 });
  }

  // Refresh the cached public page (old and new address) so changes show immediately
  revalidatePath(`/p/${existing.slug}`);
  if (data.slug !== existing.slug) revalidatePath(`/p/${data.slug}`);

  return NextResponse.json({ page: data });
}

/** DELETE /api/own-pages/[id] */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .delete()
    .eq("id", id)
    .eq("organization_id", guard.organizationId)
    .select("slug")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  if (data) revalidatePath(`/p/${data.slug}`);
  return NextResponse.json({ success: true });
}
