import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const activeRole = (session?.user as any)?.activeRole;
    const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;
    if (!session?.user || activeRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const fd = formData as unknown as globalThis.FormData;
    const file = fd.get("file") as File | null;
    const urlInput = fd.get("url") as string | null;
    const qualityRaw = fd.get("quality") as string | null;
    const effortRaw = fd.get("effort") as string | null;

    if (!file && !urlInput) {
      return NextResponse.json({ error: "No file or URL provided" }, { status: 400 });
    }

    const quality = Math.min(100, Math.max(1, parseInt(qualityRaw || "70", 10)));
    const effort = Math.min(6, Math.max(0, parseInt(effortRaw || "4", 10)));

    let inputBuffer: Buffer;
    let originalSize: number;
    let originalName: string;

    if (urlInput) {
      // Fetch image from URL server-side (avoids CORS)
      let fetchResponse: Response;
      try {
        fetchResponse = await fetch(urlInput, { signal: AbortSignal.timeout(15000) });
      } catch {
        return NextResponse.json({ error: "Nu s-a putut accesa URL-ul" }, { status: 400 });
      }
      if (!fetchResponse.ok) {
        return NextResponse.json({ error: `URL a returnat ${fetchResponse.status}` }, { status: 400 });
      }
      const contentType = fetchResponse.headers.get("content-type") || "";
      if (!contentType.includes("webp") && !contentType.includes("image")) {
        return NextResponse.json({ error: "URL-ul nu pare să fie o imagine" }, { status: 400 });
      }
      const arrayBuffer = await fetchResponse.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_INPUT_BYTES) {
        return NextResponse.json({ error: "Imaginea depășește 20MB" }, { status: 400 });
      }
      inputBuffer = Buffer.from(arrayBuffer);
      originalSize = arrayBuffer.byteLength;
      // Derive filename from URL path
      const urlPath = new URL(urlInput).pathname;
      originalName = urlPath.split("/").pop()?.replace(/\.(webp|jpg|jpeg|png|gif)$/i, "") || "image";
    } else {
      const allowedExts = [".webp", ".jpg", ".jpeg", ".png"];
      const hasAllowedExt = allowedExts.some(ext => file!.name.toLowerCase().endsWith(ext));
      if (!hasAllowedExt) {
        return NextResponse.json({ error: "Formate acceptate: WebP, JPG, JPEG, PNG" }, { status: 400 });
      }
      if (file!.size > MAX_INPUT_BYTES) {
        return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 400 });
      }
      const arrayBuffer = await file!.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
      originalSize = file!.size;
      originalName = file!.name.replace(/\.(webp|jpg|jpeg|png)$/i, "");
    }

    // Detect if animated by checking page count
    const metadata = await sharp(inputBuffer, { animated: true }).metadata();
    const isAnimated = (metadata.pages ?? 1) > 1;

    const outputBuffer = await sharp(inputBuffer, { animated: isAnimated })
      .webp({ quality, effort, loop: 0 })
      .toBuffer();

    const outputName = `${originalName}_q${quality}.webp`;

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Content-Length": outputBuffer.length.toString(),
        "X-Original-Size": originalSize.toString(),
        "X-Compressed-Size": outputBuffer.length.toString(),
        "X-Is-Animated": isAnimated.toString(),
        "X-Pages": (metadata.pages ?? 1).toString(),
      },
    });
  } catch (error) {
    console.error("[compress-image] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compression failed" },
      { status: 500 }
    );
  }
}
