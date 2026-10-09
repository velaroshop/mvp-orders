"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface CompressedFile {
  name: string;
  originalSize: number;
  compressedSize: number;
  isAnimated: boolean;
  pages: number;
  url: string;
  savings: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ImageCompressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [files, setFiles] = useState<File[]>([]);
  const [urlItems, setUrlItems] = useState<{ url: string; name: string }[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [quality, setQuality] = useState(70);
  const [effort, setEffort] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<CompressedFile[]>([]);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadRefs = useRef<Record<string, HTMLAnchorElement>>({});

  const activeRole = (session?.user as any)?.activeRole;
  const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;

  useEffect(() => {
    if (status === "loading") return;
    if (activeRole !== "owner" || !isSuperadminOrg) {
      router.replace("/admin/orders");
    }
  }, [status, activeRole, isSuperadminOrg, router]);

  if (status === "loading" || activeRole !== "owner" || !isSuperadminOrg) {
    return null;
  }

  function handleFileSelect(selected: FileList | null) {
    if (!selected) return;
    const webpFiles = Array.from(selected).filter(f =>
      f.name.toLowerCase().endsWith(".webp")
    );
    if (webpFiles.length === 0) return;
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...webpFiles.filter(f => !existing.has(f.name))];
    });
    setResults([]);
    setErrors([]);
  }

  function removeFile(name: string) {
    setFiles(prev => prev.filter(f => f.name !== name));
    setResults(prev => {
      const r = prev.find(r => r.name === name);
      if (r) URL.revokeObjectURL(r.url);
      return prev.filter(r => r.name !== name);
    });
  }

  function addUrl() {
    setUrlError("");
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setUrlError("URL invalid");
      return;
    }
    const name = trimmed.split("/").pop()?.split("?")[0] || "image.webp";
    if (urlItems.some(u => u.url === trimmed)) {
      setUrlError("URL deja adăugat");
      return;
    }
    setUrlItems(prev => [...prev, { url: trimmed, name }]);
    setUrlInput("");
    setResults([]);
    setErrors([]);
  }

  function removeUrl(url: string) {
    setUrlItems(prev => prev.filter(u => u.url !== url));
    setResults(prev => {
      const name = url.split("/").pop()?.split("?")[0] || "image.webp";
      const r = prev.find(r => r.name === name);
      if (r) URL.revokeObjectURL(r.url);
      return prev.filter(r => r.name !== name);
    });
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  async function handleCompress() {
    const totalItems = files.length + urlItems.length;
    if (totalItems === 0 || isProcessing) return;
    setIsProcessing(true);
    setResults([]);
    setErrors([]);

    const newResults: CompressedFile[] = [];
    const newErrors: { name: string; message: string }[] = [];

    const allItems: Array<{ type: "file"; file: File } | { type: "url"; url: string; name: string }> = [
      ...files.map(f => ({ type: "file" as const, file: f })),
      ...urlItems.map(u => ({ type: "url" as const, ...u })),
    ];

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      setProgress({ current: i + 1, total: allItems.length });

      try {
        const fd = new FormData();
        fd.append("quality", quality.toString());
        fd.append("effort", effort.toString());

        let itemName: string;
        if (item.type === "file") {
          fd.append("file", item.file);
          itemName = item.file.name;
        } else {
          fd.append("url", item.url);
          itemName = item.name;
        }

        const response = await fetch("/api/superadmin/compress-image", {
          method: "POST",
          body: fd,
        });

        if (!response.ok) {
          const data = await response.json();
          newErrors.push({ name: itemName, message: data.error || "Eroare necunoscută" });
          continue;
        }

        const compressedSize = parseInt(response.headers.get("X-Compressed-Size") || "0", 10);
        const originalSize = parseInt(response.headers.get("X-Original-Size") || "0", 10);
        const isAnimated = response.headers.get("X-Is-Animated") === "true";
        const pages = parseInt(response.headers.get("X-Pages") || "1", 10);

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        newResults.push({
          name: itemName,
          originalSize,
          compressedSize,
          isAnimated,
          pages,
          url: blobUrl,
          savings: Math.round((1 - compressedSize / originalSize) * 100),
        });
      } catch (err) {
        const name = item.type === "file" ? item.file.name : item.name;
        newErrors.push({
          name,
          message: err instanceof Error ? err.message : "Eroare necunoscută",
        });
      }
    }

    setResults(newResults);
    setErrors(newErrors);
    setProgress(null);
    setIsProcessing(false);
  }

  function downloadAll() {
    results.forEach(r => {
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.name.replace(/\.webp$/i, `_q${quality}.webp`);
      a.click();
    });
  }

  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
  const totalCompressed = results.reduce((s, r) => s + r.compressedSize, 0);
  const totalSavings = totalOriginal > 0
    ? Math.round((1 - totalCompressed / totalOriginal) * 100)
    : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compresie WebP</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Comprimă fișiere WebP statice și animate fără stocare în bucket.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-zinc-600 hover:border-zinc-400 bg-zinc-800/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".webp,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="text-4xl mb-3">🖼️</div>
        <p className="text-white font-medium">
          Trage fișierele WebP aici sau dă click
        </p>
        <p className="text-zinc-500 text-sm mt-1">
          Statice și animate · Max 20 MB per fișier
        </p>
      </div>

      {/* URL input */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Sau adaugă după link
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
            placeholder="https://example.com/imagine.webp"
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={addUrl}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            Adaugă
          </button>
        </div>
        {urlError && <p className="text-xs text-red-400 mt-1.5">{urlError}</p>}
        {urlItems.length > 0 && (
          <div className="mt-3 divide-y divide-zinc-700/50 border border-zinc-700 rounded-lg overflow-hidden">
            {urlItems.map(u => (
              <div key={u.url} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-300 truncate">{u.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{u.url}</p>
                </div>
                <button
                  onClick={() => removeUrl(u.url)}
                  className="text-zinc-600 hover:text-red-400 transition-colors ml-3 shrink-0 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files queued */}
      {files.length > 0 && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">
              {files.length} fișier{files.length !== 1 ? "e" : ""} selectat{files.length !== 1 ? "e" : ""}
            </span>
            <button
              onClick={() => { setFiles([]); setResults([]); setErrors([]); }}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              Șterge tot
            </button>
          </div>
          <div className="divide-y divide-zinc-700/50">
            {files.map(f => (
              <div key={f.name} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-zinc-300 text-sm truncate">{f.name}</span>
                  <span className="text-zinc-500 text-xs shrink-0">{formatBytes(f.size)}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                  className="text-zinc-600 hover:text-red-400 transition-colors ml-3 shrink-0 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
          Setări compresie
        </h2>

        {/* Quality */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-zinc-300">
              Calitate
            </label>
            <span className="text-sm font-mono font-bold text-emerald-400">{quality}</span>
          </div>
          <input
            type="range"
            min={30}
            max={95}
            step={5}
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>30 — compresie maximă</span>
            <span>95 — calitate maximă</span>
          </div>
        </div>

        {/* Effort */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-zinc-300">
              Efort compresie
              <span className="text-zinc-500 ml-1 text-xs">(mai mare = fișier mai mic, mai lent)</span>
            </label>
            <span className="text-sm font-mono font-bold text-emerald-400">{effort}</span>
          </div>
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={effort}
            onChange={(e) => setEffort(parseInt(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>0 — rapid</span>
            <span>6 — lent, optim</span>
          </div>
        </div>
      </div>

      {/* Compress button */}
      {(() => {
        const total = files.length + urlItems.length;
        return (
          <button
            onClick={handleCompress}
            disabled={total === 0 || isProcessing}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-colors"
          >
            {isProcessing
              ? progress
                ? `Se procesează ${progress.current} / ${progress.total}...`
                : "Se procesează..."
              : total > 0
              ? `Comprimă ${total} element${total !== 1 ? "e" : ""}`
              : "Comprimă"}
          </button>
        );
      })()}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 space-y-1">
          {errors.map(e => (
            <p key={e.name} className="text-sm text-red-400">
              <span className="font-medium">{e.name}:</span> {e.message}
            </p>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          {results.length > 1 && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm text-zinc-400">
                  Total: <span className="text-white font-medium">{formatBytes(totalOriginal)}</span>
                  {" → "}
                  <span className="text-emerald-400 font-medium">{formatBytes(totalCompressed)}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Economie totală: <span className="text-emerald-400 font-semibold">{totalSavings}%</span>
                </p>
              </div>
              <button
                onClick={downloadAll}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Descarcă toate
              </button>
            </div>
          )}

          {/* Individual results */}
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.name} className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  {/* Preview */}
                  <div className="shrink-0 w-20 h-20 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700 flex items-center justify-center">
                    <img
                      src={r.url}
                      alt={r.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {r.isAnimated && (
                        <span className="px-1.5 py-0.5 bg-purple-900/40 border border-purple-700/50 text-purple-300 text-xs rounded">
                          Animat · {r.pages} cadre
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 text-xs rounded font-semibold ${
                        r.savings >= 40
                          ? "bg-emerald-900/40 border border-emerald-700/50 text-emerald-300"
                          : r.savings >= 10
                          ? "bg-yellow-900/40 border border-yellow-700/50 text-yellow-300"
                          : "bg-zinc-700 text-zinc-400"
                      }`}>
                        -{r.savings}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400 space-y-0.5">
                      <p>Original: <span className="text-zinc-200">{formatBytes(r.originalSize)}</span></p>
                      <p>Comprimat: <span className="text-emerald-400 font-medium">{formatBytes(r.compressedSize)}</span></p>
                    </div>
                  </div>

                  {/* Download */}
                  <a
                    href={r.url}
                    download={r.name.replace(/\.webp$/i, `_q${quality}.webp`)}
                    className="shrink-0 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Descarcă
                  </a>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-zinc-700">
                  <div
                    className={`h-full transition-all ${
                      r.savings >= 40 ? "bg-emerald-500" : r.savings >= 10 ? "bg-yellow-500" : "bg-zinc-500"
                    }`}
                    style={{ width: `${100 - r.savings}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
