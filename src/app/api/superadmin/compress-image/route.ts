import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// Allow up to 20MB input
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const fd = formData as unknown as globalThis.FormData;
    const file = fd.get("file") as File | null;
    const qualityRaw = fd.get("quality") as string | null;
    const effortRaw = fd.get("effort") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".webp")) {
      return NextResponse.json({ error: "Only WebP files are supported" }, { status: 400 });
    }

    if (file.size > MAX_INPUT_BYTES) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 400 });
    }

    const quality = Math.min(100, Math.max(1, parseInt(qualityRaw || "70", 10)));
    const effort = Math.min(6, Math.max(0, parseInt(effortRaw || "4", 10)));

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Detect if animated by checking page count
    const metadata = await sharp(inputBuffer, { animated: true }).metadata();
    const isAnimated = (metadata.pages ?? 1) > 1;

    const outputBuffer = await sharp(inputBuffer, { animated: isAnimated })
      .webp({ quality, effort, loop: 0 })
      .toBuffer();

    const originalName = file.name.replace(/\.webp$/i, "");
    const outputName = `${originalName}_q${quality}.webp`;

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Content-Length": outputBuffer.length.toString(),
        "X-Original-Size": file.size.toString(),
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
