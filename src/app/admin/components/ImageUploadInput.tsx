"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  /** Relative path prefix inside the org folder, e.g. "variations/prod-abc123" */
  uploadContext: string;
  maxWidth?: number;
  maxHeight?: number;
  /** WebP quality 0–1 */
  quality?: number;
  placeholder?: string;
  disabled?: boolean;
}

export default function ImageUploadInput({
  value,
  onChange,
  uploadContext,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.7,
  placeholder = "https://...",
  disabled = false,
}: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File) {
    setUploadError(null);

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Fișierul trebuie să fie sub 5MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await resizeToWebP(file, maxWidth, maxHeight, quality);
      const filename = `${Date.now()}.webp`;

      const form = new FormData();
      form.append("file", blob, filename);
      form.append("path", `${uploadContext}/${filename}`);

      const res = await fetch("/api/upload-image", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload eșuat");
      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Upload eșuat. Încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {/* Small preview */}
        {value && (
          <img
            src={value}
            alt=""
            className="w-9 h-9 rounded object-cover border border-zinc-700 shrink-0"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
        )}

        {/* URL text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => { setUploadError(null); onChange(e.target.value); }}
          className="input flex-1 min-w-0"
          placeholder={placeholder}
          disabled={disabled || uploading}
        />

        {/* Upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="btn btn-secondary btn-sm shrink-0 gap-1.5"
          title="Încarcă imagine (max 5MB)"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {uploading ? "Se încarcă..." : "Upload"}
          </span>
        </button>
      </div>

      {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          // Reset so the same file can be re-selected
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Resize image to fit within maxWidth×maxHeight and export as WebP blob. Never upscales. */
async function resizeToWebP(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      // Shrink proportionally; never upscale
      const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponibil în browser"));

      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Conversia în WebP a eșuat"));
          resolve(blob);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Fișierul nu este o imagine validă"));
    };

    img.src = objectUrl;
  });
}
