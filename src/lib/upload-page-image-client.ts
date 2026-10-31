// Browser side of the image upload in the page editor.
// Vercel accepts request bodies up to ~4.5 MB, so larger still images are first shrunk in the browser;
// the server then does the final resize/compression. Large animated GIF/WebP cannot be shrunk here.

const SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
}

async function shrinkInBrowser(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Fișierul nu este o imagine validă"));
      el.src = objectUrl;
    });
    const ratio = Math.min(2400 / img.naturalWidth, 2400 / img.naturalHeight, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponibil în browser");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= SAFE_UPLOAD_BYTES) return blob;
    }
    throw new Error("Imaginea e prea grea. Comprim-o întâi în Convertor Imagini.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadPageImage(file: File, maxWidth = 800): Promise<UploadedImage> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Imaginea depășește 15 MB");

  let body: Blob = file;
  if (file.size > SAFE_UPLOAD_BYTES) {
    if (file.type === "image/gif" || file.type === "image/webp") {
      throw new Error("GIF/WebP mai mare de 4 MB: comprimă-l întâi în Convertor Imagini (se păstrează animația).");
    }
    body = await shrinkInBrowser(file);
  }

  const form = new FormData();
  form.append("file", body, file.name);
  form.append("maxWidth", String(maxWidth));

  const res = await fetch("/api/own-pages/upload-image", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Încărcarea a eșuat");
  return data as UploadedImage;
}
