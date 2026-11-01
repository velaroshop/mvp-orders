import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "landing-pages";
// Vercel accepts request bodies up to ~4.5 MB; a looping clip should be far smaller anyway
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * POST /api/own-pages/upload-video (superadmin only)
 * multipart/form-data: file (MP4). The video is stored as it is (no conversion on the server): it must already be a small
 * H.264 MP4 without sound. Only real MP4 files are accepted (checked by their content, not by the file name).
 */
export async function POST(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  try {
    const form = (await request.formData()) as unknown as globalThis.FormData;
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "Lipsește fișierul" }, { status: 400 });

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fișierul are ${(buffer.length / 1048576).toFixed(1)} MB. Maximum 4 MB: comprimă video-ul (de exemplu 480×480, fără sunet) și încearcă din nou.` },
        { status: 400 },
      );
    }
    // An MP4 starts with a box whose type "ftyp" sits at bytes 4-8
    if (buffer.length < 12 || buffer.subarray(4, 8).toString("ascii") !== "ftyp") {
      return NextResponse.json({ error: "Fișierul nu este un MP4 valid." }, { status: 400 });
    }

    const path = `${guard.organizationId}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.mp4`;
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType: "video/mp4",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) {
      console.error("[Own Pages] video upload failed:", uploadError.message);
      const notAllowed = /mime|not supported|invalid/i.test(uploadError.message);
      return NextResponse.json(
        { error: notAllowed ? "Bucket-ul nu acceptă încă video: rulează migrarea 097 în Supabase." : "Încărcarea a eșuat" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: publicUrl, bytes: buffer.length });
  } catch (error) {
    console.error("[Own Pages] video upload error:", error);
    return NextResponse.json({ error: "Încărcarea a eșuat" }, { status: 500 });
  }
}
