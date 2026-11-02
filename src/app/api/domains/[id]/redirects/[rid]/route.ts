import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { REDIRECT_CODES } from "@/lib/redirect-rules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string; rid: string }> };

/** PUT /api/domains/[id]/redirects/[rid] - Body: { status_code } (for example 301 once the rule is verified) */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id, rid } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(rid)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const code = Number(body.status_code);
  if (!REDIRECT_CODES.includes(code as (typeof REDIRECT_CODES)[number])) return NextResponse.json({ error: "Tip de redirect invalid" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("domain_redirects")
    .update({ status_code: code, updated_at: new Date().toISOString() })
    .eq("id", rid)
    .eq("domain_id", id)
    .eq("organization_id", guard.organizationId)
    .select("id, from_path, to_url, status_code, created_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to save redirect" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ redirect: data });
}

/** DELETE /api/domains/[id]/redirects/[rid] */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id, rid } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(rid)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("domain_redirects").delete().eq("id", rid).eq("domain_id", id).eq("organization_id", guard.organizationId);
  if (error) return NextResponse.json({ error: "Failed to delete redirect" }, { status: 500 });
  return NextResponse.json({ success: true });
}
