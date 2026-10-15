"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

type OutputFormat = "webm" | "webp";

interface ConvertedFile {
  name: string;
  originalSize: number;
  convertedSize: number;
  url: string;
  format: OutputFormat;
  firstFrameUrl: string;
  firstFrameName: string;
}

export default function VideoConvertPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);
  const [result, setResult] = useState<ConvertedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("webp");
  const [crf, setCrf] = useState(40);
  const [scale, setScale] = useState("640");
  const [fps, setFps] = useState(15);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) router.replace("/admin/orders");
  }, [status, session, router]);

  async function loadFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    setIsLoading(true);
    try {
      if (typeof SharedArrayBuffer === "undefined") {
        throw new Error("SharedArrayBuffer indisponibil — headerele COOP/COEP lipsesc pe această pagină.");
      }
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => {
        setConvertProgress(Math.round(progress * 100));
      });
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConvert() {
    if (!file) return;
    setError(null);
    setResult(null);
    setConvertProgress(0);
    setIsConverting(true);
    try {
      const ffmpeg = await loadFFmpeg();
      await ffmpeg.writeFile("input.mp4", await fetchFile(file));

      let outputFile: string;
      let mimeType: string;

      if (outputFormat === "webp") {
        // Animated WebP — works in <img> tags, ideal for upsells
        // libwebp quality: 0=worst, 100=best (opposite of CRF slider)
        const webpQuality = Math.round(90 - ((crf - 20) / 35) * 70); // 90 at crf=20, 20 at crf=55
        outputFile = "output.webp";
        mimeType = "image/webp";
        await ffmpeg.exec([
          "-i", "input.mp4",
          "-c:v", "libwebp",
          "-loop", "0",
          "-quality", String(webpQuality),
          "-preset", "picture",
          "-vf", `scale=${scale}:-2,fps=${fps.toString()}`,
          "-an",
          outputFile,
        ]);
      } else {
        // WebM — smaller files, needs <video> tag
        // VP8 has no pure CRF mode; map slider to bitrate range 600k→40k
        const bitrate = Math.round(600 * Math.pow(40 / 600, (crf - 20) / (55 - 20)));
        outputFile = "output.webm";
        mimeType = "video/webm";
        await ffmpeg.exec([
          "-i", "input.mp4",
          "-c:v", "libvpx",
          "-b:v", `${bitrate}k`,
          "-vf", `scale=${scale}:-2,fps=${fps.toString()}`,
          "-an",
          "-cpu-used", "5",
          "-threads", "1",
          outputFile,
        ]);
      }

      const raw = await ffmpeg.readFile(outputFile);
      const blob = new Blob(
        [raw instanceof Uint8Array ? raw.slice() : raw],
        { type: mimeType }
      );
      const url = URL.createObjectURL(blob);
      const ext = outputFormat === "webp" ? ".webp" : ".webm";

      // Extract first frame as static WebP
      await ffmpeg.exec([
        "-i", "input.mp4",
        "-vframes", "1",
        "-vf", `scale=${scale}:-2`,
        "-c:v", "webp",
        "-quality", "90",
        "firstframe.webp",
      ]);
      const rawFrame = await ffmpeg.readFile("firstframe.webp");
      const frameBlob = new Blob(
        [rawFrame instanceof Uint8Array ? rawFrame.slice() : rawFrame],
        { type: "image/webp" }
      );
      const frameUrl = URL.createObjectURL(frameBlob);
      const baseName = file.name.replace(/\.[^.]+$/, "");

      setResult({
        name: baseName + ext,
        originalSize: file.size,
        convertedSize: blob.size,
        url,
        format: outputFormat,
        firstFrameUrl: frameUrl,
        firstFrameName: baseName + "-firstframe.webp",
      });
    } catch (err: any) {
      console.error("[VideoConvert] Error:", err);
      const msg = err?.message || String(err) || "Eroare necunoscută";
      setError(`Eroare: ${msg}`);
    } finally {
      setIsConverting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = Array.from(e.dataTransfer.files).find(f =>
      f.type === "video/mp4" || f.name.endsWith(".mp4") || f.name.endsWith(".mov")
    );
    if (f) { setFile(f); setResult(null); setError(null); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  }

  const savings = result ? ((1 - result.convertedSize / result.originalSize) * 100) : 0;

  if (status === "loading" || !session?.user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="page-title">Convertor Video</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Convertește MP4/MOV în WebP animat (pentru upsell-uri) sau WebM (pentru video embed).
        </p>
      </div>

      {/* Format toggle */}
      <div className="card p-1 flex gap-1">
        <button
          onClick={() => { setOutputFormat("webp"); setResult(null); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            outputFormat === "webp"
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          WebP animat
          <span className="block text-[10px] font-normal opacity-70">funcționează în &lt;img&gt; · upsell-uri</span>
        </button>
        <button
          onClick={() => { setOutputFormat("webm"); setResult(null); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            outputFormat === "webm"
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          WebM video
          <span className="block text-[10px] font-normal opacity-70">necesită tag &lt;video&gt; · fișier mai mic</span>
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : file
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          className="hidden"
          onChange={handleFileChange}
        />
        {file ? (
          <div>
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-zinc-400 text-sm mt-1">{formatBytes(file.size)}</p>
            <p className="text-zinc-400 text-xs mt-2">Click pentru a schimba fișierul</p>
          </div>
        ) : (
          <div>
            <svg className="w-10 h-10 mx-auto text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-zinc-300 font-medium">Trage un fișier MP4 / MOV aici</p>
            <p className="text-zinc-400 text-sm mt-1">sau click pentru a selecta</p>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="card p-4 space-y-4">
        <h2 className="text-sm font-semibold text-white">Setări conversie</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Lățime (px)</label>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="input"
            >
              <option value="320">320px — micro</option>
              <option value="480">480px — mic</option>
              <option value="640">640px — mediu</option>
              <option value="960">960px — mare</option>
              <option value="1280">1280px — HD</option>
            </select>
          </div>

          <div>
            <label className="label">FPS: {fps}</label>
            <input
              type="range"
              min={5}
              max={20}
              step={1}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full mt-2 accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5">
              <span>5 fps</span>
              <span>20 fps</span>
            </div>
          </div>

          <div>
            <label className="label">Calitate: {crf}</label>
            <input
              type="range"
              min={20}
              max={55}
              value={crf}
              onChange={(e) => setCrf(Number(e.target.value))}
              className="w-full mt-2 accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5">
              <span>Mai bună</span>
              <span>Mai mică</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          {outputFormat === "webp"
            ? "Pentru 4-5 sec la 100–400 KB: lățime 480–640px, FPS 8–15, calitate 35–45. WebP animat e mai mare decât WebM dar funcționează direct în upsell-uri."
            : "Pentru 4-5 sec la 50–200 KB: lățime 480–640px, FPS 8–15, calitate 38–45. Audio este eliminat automat."}
        </p>
      </div>

      {/* Convert button */}
      <button
        onClick={handleConvert}
        disabled={!file || isConverting || isLoading}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        {isLoading
          ? "Se încarcă ffmpeg.wasm (~30MB, o singură dată)..."
          : isConverting
          ? `Se convertește... ${convertProgress}%`
          : `Convertește în ${outputFormat === "webp" ? "WebP animat" : "WebM"}`}
      </button>

      {/* Progress bar */}
      {(isLoading || isConverting) && (
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: isLoading ? "100%" : `${convertProgress}%` }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-700/60 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Rezultat</h2>
            <span className={`text-sm font-bold ${savings > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {savings > 0 ? `-${savings.toFixed(1)}%` : `+${Math.abs(savings).toFixed(1)}%`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-400 text-xs mb-1">Original (MP4)</p>
              <p className="text-white font-semibold">{formatBytes(result.originalSize)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-400 text-xs mb-1">
                Convertit ({result.format === "webp" ? "WebP animat" : "WebM"})
              </p>
              <p className="text-white font-semibold">{formatBytes(result.convertedSize)}</p>
            </div>
          </div>

          {/* Preview: WebP as <img>, WebM as <video> */}
          {result.format === "webp" ? (
            <img
              src={result.url}
              alt="preview"
              className="w-full rounded-lg bg-black"
            />
          ) : (
            <video
              src={result.url}
              controls
              autoPlay
              loop
              muted
              className="w-full rounded-lg bg-black"
            />
          )}

          <a
            href={result.url}
            download={result.name}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descarcă {result.name}
          </a>

          {/* First frame */}
          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Primul cadru (WebP static)</p>
            <img
              src={result.firstFrameUrl}
              alt="First frame"
              className="w-full rounded-lg bg-black"
            />
            <a
              href={result.firstFrameUrl}
              download={result.firstFrameName}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descarcă {result.firstFrameName}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
