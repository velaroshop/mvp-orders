import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { MAX_DOMAINS_PER_ORG, parseHostname, verificationRecord } from "@/lib/domain-input";

// "*": keeps working before migration 095 (vercel_added) has been run
const COLUMNS = "*";

type Row = { id: string; hostname: string; status: string; verification_token: string; verified_at: string | null; created_at: string; vercel_added?: boolean; root_redirect?: string | null };
const present = (row: Row) => ({
  id: row.id,
  hostname: row.hostname,
  status: row.status,
  verified_at: row.verified_at,
  vercel_added: row.vercel_added === true,
  root_redirect: row.root_redirect ?? null,
  pages_total: 0,
  pages_published: 0,
  created_at: row.created_at,
  record: verificationRecord(row.hostname, row.verification_token),
});

/** GET /api/domains - domains of the active organization (superadmin only) */
export async function GET() {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await supabaseAdmin.from("page_domains").select(COLUMNS).eq("organization_id", guard.organizationId).order("created_at", { ascending: true });
  if (error) {
    console.error("[Domains] list failed:", error.message);
    return NextResponse.json({ error: "Failed to load domains" }, { status: 500 });
  }
  // How many pages live on each domain (shown before a domain is deleted: those pages would be left without one)
  const { data: pages } = await supabaseAdmin.from("landing_page_content").select("domain_id, status").eq("organization_id", guard.organizationId).not("domain_id", "is", null);
  const domains = (data as Row[] | null ?? []).map(present).map((d) => {
    const own = (pages ?? []).filter((p) => p.domain_id === d.id);
    return { ...d, pages_total: own.length, pages_published: own.filter((p) => p.status === "published").length };
  });
  return NextResponse.json({ domains, limit: MAX_DOMAINS_PER_ORG });
}

/** POST /api/domains - add a domain (starts "pending" until the TXT record is verified). Body: { hostname } */
export async function POST(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseHostname(body.hostname);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { count } = await supabaseAdmin.from("page_domains").select("id", { count: "exact", head: true }).eq("organization_id", guard.organizationId);
  if ((count ?? 0) >= MAX_DOMAINS_PER_ORG) {
    return NextResponse.json({ error: `Poți avea cel mult ${MAX_DOMAINS_PER_ORG} domenii` }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("page_domains")
    .insert({ organization_id: guard.organizationId, hostname: parsed.hostname, verification_token: randomBytes(16).toString("hex") })
    .select(COLUMNS)
    .single();
  if (error) {
    // 23505: this organization already added it
    if (error.code === "23505") return NextResponse.json({ error: "Ai adăugat deja acest domeniu" }, { status: 409 });
    console.error("[Domains] create failed:", error.message);
    return NextResponse.json({ error: "Failed to add domain" }, { status: 500 });
  }
  return NextResponse.json({ domain: present(data as Row) }, { status: 201 });
}
