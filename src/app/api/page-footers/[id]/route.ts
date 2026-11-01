import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { parseFooterContent, parseFooterName } from "@/lib/page-footers-input";

const COLUMNS = "id, name, block, is_default, updated_at";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/page-footers/[id] */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await supabaseAdmin.from("page_footers").select(COLUMNS).eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ footer: data });
}

/** PUT /api/page-footers/[id] - Body: { name?, block?, is_default? } (is_default true makes it the only default) */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) {
    const name = parseFooterName(body.name);
    if (!name) return NextResponse.json({ error: "Dă un nume footerului" }, { status: 400 });
    update.name = name;
  }
  if (body.block !== undefined) {
    const block = parseFooterContent(body.block);
    if (!block) return NextResponse.json({ error: "Conținut footer invalid" }, { status: 400 });
    update.block = block;
  }

  const { data: existing } = await supabaseAdmin.from("page_footers").select("id, is_default").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.is_default === true && !existing.is_default) {
    // Only one default per organization: clear the current one first
    const { error: clearError } = await supabaseAdmin.from("page_footers").update({ is_default: false }).eq("organization_id", guard.organizationId).eq("is_default", true);
    if (clearError) return NextResponse.json({ error: "Failed to change the default footer" }, { status: 500 });
    update.is_default = true;
  } else if (body.is_default === false && existing.is_default) {
    update.is_default = false;
  }

  const { data, error } = await supabaseAdmin.from("page_footers").update(update).eq("id", id).eq("organization_id", guard.organizationId).select(COLUMNS).single();
  if (error) {
    console.error("[Page Footers] save failed:", error.message);
    return NextResponse.json({ error: "Failed to save footer" }, { status: 500 });
  }
  revalidatePath("/p/[slug]", "page");
  return NextResponse.json({ footer: data });
}

/** DELETE /api/page-footers/[id] - pages that used it fall back to the default footer; if the default is deleted, the oldest remaining becomes the default */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: existing } = await supabaseAdmin.from("page_footers").select("id, is_default").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("page_footers").delete().eq("id", id).eq("organization_id", guard.organizationId);
  if (error) return NextResponse.json({ error: "Failed to delete footer" }, { status: 500 });

  if (existing.is_default) {
    const { data: next } = await supabaseAdmin.from("page_footers").select("id").eq("organization_id", guard.organizationId).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (next) await supabaseAdmin.from("page_footers").update({ is_default: true }).eq("id", next.id);
  }
  revalidatePath("/p/[slug]", "page");
  return NextResponse.json({ success: true });
}
