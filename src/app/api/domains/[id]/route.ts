import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { isVercelConfigured, removeDomain } from "@/lib/vercel-domains";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PUT /api/domains/[id] - Body: { rootRedirect } where the bare address of the domain goes (https URL, or empty for none) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  let rootRedirect: string | null = null;
  if (typeof body.rootRedirect === "string" && body.rootRedirect.trim() !== "") {
    try {
      const url = new URL(body.rootRedirect.trim());
      if (url.protocol !== "https:") throw new Error("not https");
      rootRedirect = url.toString();
    } catch {
      return NextResponse.json({ error: "Adresa de redirecționare trebuie să înceapă cu https://" }, { status: 400 });
    }
  }

  const { data: domain } = await supabaseAdmin.from("page_domains").select("hostname").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // A domain must not redirect to itself
  if (rootRedirect && new URL(rootRedirect).hostname === domain.hostname) return NextResponse.json({ error: "Domeniul nu se poate redirecționa spre sine" }, { status: 400 });

  const { error } = await supabaseAdmin.from("page_domains").update({ root_redirect: rootRedirect, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", guard.organizationId);
  if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ rootRedirect });
}

/** DELETE /api/domains/[id] */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If it was attached to the hosting project, detach it too (best effort: a failure is only logged)
  const { data: domain } = await supabaseAdmin.from("page_domains").select("hostname, status").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (domain && domain.status !== "pending" && isVercelConfigured()) {
    const { data: stillUsed } = await supabaseAdmin.from("page_domains").select("id").eq("hostname", domain.hostname).neq("id", id).neq("status", "pending").limit(1);
    if (!stillUsed?.length) {
      const removed = await removeDomain(domain.hostname);
      if (!removed.ok && removed.status !== 404) console.error("[Domains] vercel remove failed:", domain.hostname, removed.message);
    }
  }

  const { error } = await supabaseAdmin.from("page_domains").delete().eq("id", id).eq("organization_id", guard.organizationId);
  if (error) return NextResponse.json({ error: "Failed to delete domain" }, { status: 500 });
  return NextResponse.json({ success: true });
}
