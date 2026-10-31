import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif"]);

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  animated: boolean;
}

/**
 * Prepares an uploaded image for own pages: raster formats only, EXIF rotation applied, shrunk to maxWidth
 * (never enlarged) and re-encoded as WebP. Animated GIF/WebP stay animated.
 * Throws an Error with a user-facing message when the file is not usable.
 */
export async function processPageImage(input: Buffer, maxWidth: number): Promise<ProcessedImage> {
  if (input.length === 0) throw new Error("Fișierul e gol");
  if (input.length > MAX_UPLOAD_BYTES) throw new Error("Imaginea depășește 15 MB");

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { animated: true }).metadata();
  } catch {
    throw new Error("Fișierul nu este o imagine validă");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new Error("Formate acceptate: JPG, PNG, WebP, GIF, AVIF");
  }

  const animated = (meta.pages ?? 1) > 1;
  const width = Math.min(Math.max(Math.round(maxWidth) || 800, 64), 1600);

  const buffer = await sharp(input, { animated })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 75, effort: 5, loop: 0 })
    .toBuffer();

  const out = await sharp(buffer, { animated }).metadata();
  const outWidth = out.width ?? 0;
  // For animated images "height" is all frames stacked: pageHeight is the real frame height
  const outHeight = (animated ? out.pageHeight : out.height) ?? 0;
  if (!outWidth || !outHeight) throw new Error("Nu am putut procesa imaginea");

  return { buffer, width: outWidth, height: outHeight, animated };
}
