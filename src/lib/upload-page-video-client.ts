// Browser side of the video upload in the page editor: the MP4 goes to the server as it is.
const MAX_BYTES = 4 * 1024 * 1024;

export async function uploadPageVideo(file: File): Promise<{ url: string; bytes: number }> {
  if (file.type && file.type !== "video/mp4") throw new Error("Doar fișiere MP4.");
  if (file.size > MAX_BYTES) {
    throw new Error(`Fișierul are ${(file.size / 1048576).toFixed(1)} MB. Maximum 4 MB: comprimă video-ul (de exemplu 480×480, fără sunet).`);
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/own-pages/upload-video", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Încărcarea a eșuat");
  return { url: data.url, bytes: data.bytes };
}
