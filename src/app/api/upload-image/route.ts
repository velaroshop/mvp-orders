import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const BUCKET = "images";
// Max size after client-side processing (WebP 400×400 at 0.70 should be well under 300KB)
const MAX_PROCESSED_BYTES = 2 * 1024 * 1024; // 2MB safety ceiling

/**
 * POST /api/upload-image
 * Body: multipart/form-data
 *   file  — WebP blob (already resized client-side)
 *   path  — relative path within org folder, e.g. "variations/prod-123/1234567890.webp"
 * Returns: { url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = session.user.activeOrganizationId;

    const formData = await request.formData();
    // Cast to globalThis.FormData to access Web API .get() — Next.js returns fetch FormData
    const fd = formData as unknown as globalThis.FormData;
    const file = fd.get("file") as File | null;
    const path = fd.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
    }

    // Sanity-check processed size
    if (file.size > MAX_PROCESSED_BYTES) {
      return NextResponse.json(
        { error: "Fișierul depășește 2MB după procesare" },
        { status: 400 }
      );
    }

    // Scope every upload under the org's own folder
    const safePath = `${orgId}/${path}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(safePath, buffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-image] Supabase storage error:", uploadError);
      return NextResponse.json({ error: "Upload eșuat" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(safePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Error in POST /api/upload-image:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
