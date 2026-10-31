import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/superadmin-guard";
import { processPageImage } from "@/lib/process-page-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dedicated public bucket for own landing pages (migration 091): WebP only, small files
const BUCKET = "landing-pages";

/**
 * POST /api/own-pages/upload-image (superadmin only)
 * multipart/form-data: file (jpg/png/webp/gif/avif), maxWidth (optional, default 800)
 * The image is shrunk and re-encoded as WebP, stored in the public "landing-pages" bucket under the
 * organization's folder, and the public URL plus the final size are returned (so image blocks can reserve their space).
 */
export async function POST(request: NextRequest) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  try {
    const form = (await request.formData()) as unknown as globalThis.FormData;
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Lipsește fișierul" }, { status: 400 });
    }
    const maxWidth = Number(form.get("maxWidth")) || 800;

    const original = Buffer.from(await (file as File).arrayBuffer());
    let processed;
    try {
      processed = await processPageImage(original, maxWidth);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Imagine invalidă" }, { status: 400 });
    }

    const path = `${guard.organizationId}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.webp`;
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, processed.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) {
      console.error("[Own Pages] image upload failed:", uploadError.message);
      const missingBucket = /bucket not found/i.test(uploadError.message);
      return NextResponse.json(
        { error: missingBucket ? "Bucket-ul „landing-pages” nu există încă: rulează migrarea 091 în Supabase." : "Încărcarea a eșuat" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
      url: publicUrl,
      width: processed.width,
      height: processed.height,
      animated: processed.animated,
      bytes: processed.buffer.length,
      originalBytes: original.length,
    });
  } catch (error) {
    console.error("[Own Pages] image upload error:", error);
    return NextResponse.json({ error: "Eroare la procesarea imaginii" }, { status: 500 });
  }
}
