import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { processFavicon } from "@/lib/process-favicon";
import { refreshPublicPages } from "@/lib/revalidate-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "landing-pages";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

/** The storage path of a file in our bucket, from its public URL (null for anything else) */
function bucketPath(url: string | null): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const at = url ? url.indexOf(marker) : -1;
  return url && at >= 0 ? decodeURIComponent(url.slice(at + marker.length)) : null;
}

/**
 * POST /api/domains/[id]/favicon (superadmin) - multipart/form-data: file (image). Becomes the browser tab icon of every
 * page served on this domain. Stored as a 192x192 PNG in the landing-pages bucket.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: domain } = await supabaseAdmin.from("page_domains").select("id, favicon_url").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const form = (await request.formData()) as unknown as globalThis.FormData;
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "Lipsește fișierul" }, { status: 400 });

    let png: Buffer;
    try {
      png = await processFavicon(Buffer.from(await (file as File).arrayBuffer()));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Imagine invalidă" }, { status: 400 });
    }

    const path = `${guard.organizationId}/favicon-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.png`;
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, png, { contentType: "image/png", cacheControl: "31536000", upsert: false });
    if (uploadError) {
      console.error("[Domains] favicon upload failed:", uploadError.message);
      const notAllowed = /mime|not supported|invalid/i.test(uploadError.message);
      return NextResponse.json({ error: notAllowed ? "Bucket-ul nu acceptă încă PNG: rulează migrarea 098 în Supabase." : "Încărcarea a eșuat" }, { status: 500 });
    }
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    const { error } = await supabaseAdmin.from("page_domains").update({ favicon_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", guard.organizationId);
    if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });

    // The previous icon file is no longer used (best effort)
    const old = bucketPath(domain.favicon_url);
    if (old) await supabaseAdmin.storage.from(BUCKET).remove([old]);

    refreshPublicPages();
    return NextResponse.json({ faviconUrl: publicUrl });
  } catch (error) {
    console.error("[Domains] favicon error:", error);
    return NextResponse.json({ error: "Încărcarea a eșuat" }, { status: 500 });
  }
}

/** DELETE /api/domains/[id]/favicon (superadmin) - back to the neutral icon */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: domain } = await supabaseAdmin.from("page_domains").select("id, favicon_url").eq("id", id).eq("organization_id", guard.organizationId).maybeSingle();
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("page_domains").update({ favicon_url: null, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", guard.organizationId);
  if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  const old = bucketPath(domain.favicon_url);
  if (old) await supabaseAdmin.storage.from(BUCKET).remove([old]);
  refreshPublicPages();
  return NextResponse.json({ success: true });
}
