import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { MAX_REDIRECTS_PER_DOMAIN, SHOPIFY_PRESET, validateRule, type RedirectRule } from "@/lib/redirect-rules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = "id, from_path, to_url, status_code, created_at";

type Ctx = { params: Promise<{ id: string }> };

async function ownDomain(organizationId: string, id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await supabaseAdmin.from("page_domains").select("id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  return data;
}

async function loadRules(domainId: string) {
  const { data, error } = await supabaseAdmin.from("domain_redirects").select(COLUMNS).eq("domain_id", domainId).order("from_path", { ascending: true });
  return { rules: (data ?? []) as (RedirectRule & { id: string; created_at: string })[], error };
}

/** GET /api/domains/[id]/redirects - the redirect rules of a domain (superadmin) */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!(await ownDomain(guard.organizationId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rules, error } = await loadRules(id);
  if (error) {
    console.error("[Redirects] list failed:", error.message);
    return NextResponse.json({ error: "Failed to load redirects" }, { status: 500 });
  }
  return NextResponse.json({ redirects: rules, limit: MAX_REDIRECTS_PER_DOMAIN });
}

/**
 * POST /api/domains/[id]/redirects (superadmin)
 * Body: { from_path, to_url, status_code? }  or  { preset: "shopify" } to add the usual Shopify redirects (existing ones are kept)
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!(await ownDomain(guard.organizationId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { rules, error: loadError } = await loadRules(id);
  if (loadError) return NextResponse.json({ error: "Failed to load redirects" }, { status: 500 });

  const toInsert: RedirectRule[] = [];
  if (body.preset === "shopify") {
    const known: RedirectRule[] = [...rules];
    for (const candidate of SHOPIFY_PRESET) {
      const check = validateRule(candidate, known);
      if (check.ok) {
        toInsert.push(check.rule);
        known.push(check.rule);
      }
    }
    if (toInsert.length === 0) return NextResponse.json({ error: "Redirecturile uzuale există deja" }, { status: 409 });
  } else {
    const check = validateRule(body, rules);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    toInsert.push(check.rule);
  }

  const { data, error } = await supabaseAdmin
    .from("domain_redirects")
    .insert(toInsert.map((r) => ({ ...r, organization_id: guard.organizationId, domain_id: id })))
    .select(COLUMNS);
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Există deja o regulă pentru această adresă" }, { status: 409 });
    console.error("[Redirects] create failed:", error.message);
    return NextResponse.json({ error: "Failed to save redirect" }, { status: 500 });
  }
  return NextResponse.json({ redirects: data }, { status: 201 });
}
