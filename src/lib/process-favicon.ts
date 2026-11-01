import sharp from "sharp";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "svg"]);
export const FAVICON_SIZE = 192;

/**
 * Square PNG icon for browser tabs and the phone home screen: the whole image is kept (never cropped) and centered on a
 * transparent square. 192 px is sharp enough for every use; browsers scale it down.
 */
export async function processFavicon(input: Buffer): Promise<Buffer> {
  if (input.length === 0) throw new Error("Fișierul e gol");
  if (input.length > 4 * 1024 * 1024) throw new Error("Imaginea depășește 4 MB");
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new Error("Fișierul nu este o imagine validă");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new Error("Formate acceptate: PNG, JPG, WebP, SVG");
  if ((meta.width ?? 0) < 64 || (meta.height ?? 0) < 64) throw new Error("Imaginea e prea mică (minim 64×64 px, recomandat 192×192 sau mai mare)");

  return sharp(input)
    .rotate()
    .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
