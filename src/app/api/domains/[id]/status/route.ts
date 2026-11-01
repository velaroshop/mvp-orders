import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { dnsInstruction, getDomainConfig, getProjectDomain, isVercelConfigured, verifyProjectDomain } from "@/lib/vercel-domains";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/domains/[id]/status - checks the connection; when DNS points to the server and the certificate can be issued, the domain becomes "active" */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isVercelConfigured()) return NextResponse.json({ error: "Conexiunea cu Vercel nu e configurată." }, { status: 503 });

  const { data: domain } = await supabaseAdmin.from("page_domains").select("id, hostname, status, vercel_added").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (domain.status === "pending" || !domain.vercel_added) return NextResponse.json({ error: "Domeniul nu e conectat încă." }, { status: 409 });

  let project = await getProjectDomain(domain.hostname);
  if (!project.ok) return NextResponse.json({ error: `Nu am putut citi domeniul din Vercel: ${project.message}` }, { status: 502 });
  if (!project.data.verified) {
    const retried = await verifyProjectDomain(domain.hostname);
    if (retried.ok) project = retried;
  }

  const config = await getDomainConfig(domain.hostname);
  if (!config.ok) return NextResponse.json({ error: `Nu am putut citi configurarea DNS: ${config.message}` }, { status: 502 });

  const dns = dnsInstruction(domain.hostname, project.data.apexName, config.data);
  const active = project.data.verified && !config.data.misconfigured;

  if (active && domain.status !== "active") {
    await supabaseAdmin.from("page_domains").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", guard.organizationId);
  }
  // DNS changed away again: back to "verified" (the pages are no longer reachable on it)
  if (!active && domain.status === "active") {
    await supabaseAdmin.from("page_domains").update({ status: "verified", updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", guard.organizationId);
  }

  return NextResponse.json({
    active,
    status: active ? "active" : "verified",
    vercelVerified: project.data.verified,
    vercelChallenge: project.data.verified ? null : (project.data.verification[0] ?? null),
    dns,
  });
}
