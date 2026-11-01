import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { addDomain, dnsInstruction, getDomainConfig, isVercelConfigured } from "@/lib/vercel-domains";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/domains/[id]/connect - adds a VERIFIED domain to the hosting project and returns the DNS record to create */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isVercelConfigured()) return NextResponse.json({ error: "Conexiunea cu Vercel nu e configurată (lipsesc VERCEL_API_TOKEN / VERCEL_PROJECT_ID)." }, { status: 503 });

  const { data: domain } = await supabaseAdmin.from("page_domains").select("id, hostname, status").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only a domain whose ownership was proven may be attached (prevents taking over somebody else's subdomain)
  if (domain.status === "pending") return NextResponse.json({ error: "Verifică mai întâi proprietatea domeniului (recordul TXT)." }, { status: 409 });

  const added = await addDomain(domain.hostname);
  if (!added.ok) {
    console.error("[Domains] vercel add failed:", domain.hostname, added.status, added.code, added.message);
    const inUse = added.status === 409;
    return NextResponse.json(
      { error: inUse ? "Domeniul e deja folosit într-un alt proiect Vercel. Scoate-l de acolo și încearcă din nou." : `Vercel a refuzat domeniul: ${added.message}` },
      { status: inUse ? 409 : 502 },
    );
  }

  await supabaseAdmin.from("page_domains").update({ vercel_added: true, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", guard.organizationId);

  const config = await getDomainConfig(domain.hostname);
  return NextResponse.json({
    connected: true,
    vercelVerified: added.data.verified,
    vercelChallenge: added.data.verified ? null : (added.data.verification[0] ?? null),
    dns: config.ok ? dnsInstruction(domain.hostname, added.data.apexName, config.data) : null,
  });
}
