import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { checkVerificationTxt } from "@/lib/domain-verify";
import { verificationRecord } from "@/lib/domain-input";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/domains/[id]/verify - looks for the TXT record; if found, the domain becomes "verified" */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: domain } = await supabaseAdmin
    .from("page_domains")
    .select("id, hostname, status, verification_token")
    .eq("id", id)
    .eq("organization_id", guard.organizationId)
    .maybeSingle();
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (domain.status !== "pending") return NextResponse.json({ status: domain.status, verified: true });

  const check = await checkVerificationTxt(domain.hostname, domain.verification_token);
  if (!check.ok) {
    const record = verificationRecord(domain.hostname, domain.verification_token);
    return NextResponse.json({
      verified: false,
      message:
        check.reason === "lookup_failed"
          ? "Nu am putut interoga DNS-ul acum. Încearcă din nou în câteva minute."
          : `Nu am găsit încă recordul TXT ${record.name}. DNS-ul poate dura până la câteva ore să se actualizeze.`,
    });
  }

  const { error } = await supabaseAdmin
    .from("page_domains")
    .update({ status: "verified", verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", guard.organizationId);
  if (error) {
    // 23505: another organization already holds this hostname as verified
    if (error.code === "23505") return NextResponse.json({ verified: false, message: "Acest domeniu este deja verificat de altă organizație." }, { status: 409 });
    console.error("[Domains] verify failed:", error.message);
    return NextResponse.json({ error: "Failed to verify domain" }, { status: 500 });
  }
  return NextResponse.json({ verified: true, status: "verified" });
}
