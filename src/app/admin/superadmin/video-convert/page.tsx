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

type OutputFormat = "mp4" | "webp";

// The video block of the own pages accepts MP4 files up to 4 MB
const MP4_LIMIT_BYTES = 4 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["mp4", "mov", "webm", "gif", "webp", "apng"];

const DEFAULTS: Record<OutputFormat, { scale: string; fps: number; crf: number }> = {
  webp: { scale: "640", fps: 15, crf: 40 },
  mp4: { scale: "480", fps: 12, crf: 32 },
};

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() || "";

/**
 * ffmpeg.wasm cannot read animated WebP (it takes the first frame only), so the frames are decoded by the browser
 * (ImageDecoder: Chrome, Edge) and handed over as a numbered PNG sequence with the duration of every frame.
 * Returns the input arguments for ffmpeg and the first frame file.
 */
async function writeWebpFrames(ffmpeg: FFmpeg, file: File, written: string[]) {
  const ImageDecoderClass = (window as unknown as { ImageDecoder?: new (init: { data: BufferSource; type: string }) => any }).ImageDecoder;
  if (!ImageDecoderClass) throw new Error("Acest browser nu poate citi WebP animat. Folosește Chrome sau Edge.");
  const decoder = new ImageDecoderClass({ data: await file.arrayBuffer(), type: "image/webp" });
  await decoder.tracks.ready;
  const count: number = decoder.tracks.selectedTrack.frameCount;
  if (count < 2) throw new Error("Acest WebP nu este animat (are un singur cadru).");

  let canvas: HTMLCanvasElement | null = null;
  let list = "";
  for (let i = 0; i < count; i++) {
    const { image } = await decoder.decode({ frameIndex: i });
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = image.displayWidth;
      canvas.height = image.displayHeight;
    }
    const ctx = canvas.getContext("2d")!;
    // Transparent areas become white, as on the pages
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    const seconds = Math.max(0.01, (image.duration ?? 100000) / 1_000_000);
    image.close();
    const png = await new Promise<Blob>((resolve, reject) => canvas!.toBlob((b) => (b ? resolve(b) : reject(new Error("Nu am putut citi un cadru"))), "image/png"));
    const name = `frame${String(i).padStart(4, "0")}.png`;
    await ffmpeg.writeFile(name, new Uint8Array(await png.arrayBuffer()));
    written.push(name);
    list += `file '${name}'\nduration ${seconds.toFixed(3)}\n`;
  }
  decoder.close();
  // The concat demuxer ignores the duration of the last entry unless the file is repeated
  list += `file 'frame${String(count - 1).padStart(4, "0")}.png'\n`;
  await ffmpeg.writeFile("frames.txt", list);
  written.push("frames.txt");
  return { inputArgs: ["-f", "concat", "-safe", "0", "-i", "frames.txt"], firstFrame: "frame0000.png" };
}

interface ConvertedFile {
  name: string;
  originalSize: number;
  originalLabel: string;
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
  const [crf, setCrf] = useState(DEFAULTS.webp.crf);
  const [scale, setScale] = useState(DEFAULTS.webp.scale);
  const [fps, setFps] = useState(DEFAULTS.webp.fps);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) router.replace("/admin/orders");
  }, [status, session, router]);

  // The COOP/COEP headers only take effect on a full page load: after a client-side navigation (sidebar link) the
  // page is not isolated and ffmpeg cannot start. Reload once; the flag prevents a loop if the headers are really missing.
  useEffect(() => {
    try {
      if (window.crossOriginIsolated) {
        sessionStorage.removeItem("video-convert-reloaded");
        return;
      }
      if (sessionStorage.getItem("video-convert-reloaded")) return;
      sessionStorage.setItem("video-convert-reloaded", "1");
    } catch {
      return;
    }
    window.location.reload();
  }, []);

  async function loadFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    setIsLoading(true);
    try {
      if (typeof SharedArrayBuffer === "undefined") {
        throw new Error("SharedArrayBuffer indisponibil — headerele COOP/COEP lipsesc pe această pagină.");
      }
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => {
        // ffmpeg reports nonsense (negative or huge) when it cannot read the video's duration: ignore those values
        if (progress >= 0 && progress <= 1) setConvertProgress(Math.round(progress * 100));
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
      const inputExt = extensionOf(file.name) || "mp4";
      const written: string[] = [];
      let inputArgs: string[];
      let firstFrameInput: string[];
      if (inputExt === "webp") {
        const frames = await writeWebpFrames(ffmpeg, file, written);
        inputArgs = frames.inputArgs;
        firstFrameInput = ["-i", frames.firstFrame];
      } else {
        const inputFile = `input.${inputExt}`;
        await ffmpeg.writeFile(inputFile, await fetchFile(file));
        written.push(inputFile);
        inputArgs = ["-i", inputFile];
        firstFrameInput = inputArgs;
      }

      let outputFile: string;
      let mimeType: string;

      if (outputFormat === "webp") {
        // Animated WebP — works in <img> tags, ideal for upsells
        // libwebp quality: 0=worst, 100=best (opposite of CRF slider)
        const webpQuality = Math.round(90 - ((crf - 20) / 35) * 70); // 90 at crf=20, 20 at crf=55
        outputFile = "output.webp";
        mimeType = "image/webp";
        await ffmpeg.exec([
          ...inputArgs,
          "-c:v", "libwebp",
          "-loop", "0",
          "-quality", String(webpQuality),
          "-preset", "picture",
          "-vf", `scale=${scale}:-2,fps=${fps.toString()}`,
          "-an",
          outputFile,
        ]);
      } else {
        // MP4 (H.264, no sound) — plays everywhere in a <video> tag; this is what the video block of the own pages takes
        outputFile = "output.mp4";
        mimeType = "video/mp4";
        await ffmpeg.exec([
          ...inputArgs,
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", String(crf),
          "-profile:v", "main",
          "-level", "3.1",
          "-pix_fmt", "yuv420p",
          "-vf", `scale=${scale}:-2,fps=${fps.toString()}`,
          "-an",
          "-movflags", "+faststart",
          outputFile,
        ]);
      }

      const raw = await ffmpeg.readFile(outputFile);
      const blob = new Blob(
        [raw instanceof Uint8Array ? raw.slice() : raw],
        { type: mimeType }
      );
      const url = URL.createObjectURL(blob);
      const ext = outputFormat === "webp" ? ".webp" : ".mp4";

      // Extract first frame as static WebP — same quality mapping as animated WebP
      const frameQuality = Math.round(90 - ((crf - 20) / 35) * 70);
      await ffmpeg.exec([
        ...firstFrameInput,
        "-vframes", "1",
        "-vf", `scale=${scale}:-2`,
        "-c:v", "webp",
        "-quality", String(frameQuality),
        "firstframe.webp",
      ]);
      const rawFrame = await ffmpeg.readFile("firstframe.webp");
      const frameBlob = new Blob(
        [rawFrame instanceof Uint8Array ? rawFrame.slice() : rawFrame],
        { type: "image/webp" }
      );
      const frameUrl = URL.createObjectURL(frameBlob);
      const baseName = file.name.replace(/\.[^.]+$/, "");

      // Free the memory of the in-browser file system (frames can be many)
      for (const name of [...written, outputFile, "firstframe.webp"]) {
        try {
          await ffmpeg.deleteFile(name);
        } catch {
          // already gone
        }
      }

      setResult({
        name: baseName + ext,
        originalSize: file.size,
        originalLabel: inputExt.toUpperCase(),
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
    const f = Array.from(e.dataTransfer.files).find((f) => ACCEPTED_EXTENSIONS.includes(extensionOf(f.name)));
    if (f) { setFile(f); setResult(null); setError(null); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  }

  // Each format starts from its own recommended settings
  function switchFormat(format: OutputFormat) {
    if (format === outputFormat) return;
    setOutputFormat(format);
    setScale(DEFAULTS[format].scale);
    setFps(DEFAULTS[format].fps);
    setCrf(DEFAULTS[format].crf);
    setResult(null);
  }

  const savings = result ? ((1 - result.convertedSize / result.originalSize) * 100) : 0;

  if (status === "loading" || !session?.user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="page-title">Convertor Video</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Convertește MP4, MOV, WebM, GIF sau WebP animat în WebP animat (pentru upsell-uri) sau în MP4 mic, fără sunet (pentru blocul „Video” din paginile proprii).
        </p>
      </div>

      {/* Format toggle */}
      <div className="card p-1 flex gap-1">
        <button
          onClick={() => switchFormat("webp")}
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
          onClick={() => switchFormat("mp4")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            outputFormat === "mp4"
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          MP4 video
          <span className="block text-[10px] font-normal opacity-70">blocul „Video” · fișier mic, fără sunet</span>
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
          accept="video/mp4,video/quicktime,video/webm,image/gif,image/webp,.mp4,.mov,.webm,.gif,.webp,.apng"
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
            <p className="text-zinc-300 font-medium">Trage un fișier MP4 / MOV / WebM / GIF / WebP animat aici</p>
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
              max={outputFormat === "mp4" ? 45 : 55}
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
            : "Pentru 4-5 sec sub 300 KB: lățime 480px, FPS 10–12, calitate 30–34 (mai mare = mai mic ca fișier). Blocul „Video” acceptă maximum 4 MB. Sunetul este eliminat automat."}
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
          ? `Se convertește...${convertProgress > 0 ? ` ${convertProgress}%` : ""}`
          : `Convertește în ${outputFormat === "webp" ? "WebP animat" : "MP4"}`}
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
              <p className="text-zinc-400 text-xs mb-1">Original ({result.originalLabel})</p>
              <p className="text-white font-semibold">{formatBytes(result.originalSize)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3">
              <p className="text-zinc-400 text-xs mb-1">
                Convertit ({result.format === "webp" ? "WebP animat" : "MP4"})
              </p>
              <p className="text-white font-semibold">{formatBytes(result.convertedSize)}</p>
            </div>
          </div>

          {result.format === "mp4" && result.convertedSize > MP4_LIMIT_BYTES && (
            <div className="p-3 bg-red-950/60 border border-red-700/60 rounded-lg text-sm text-red-400">
              Prea mare pentru încărcare în blocul „Video” (maximum 4 MB). Coboară lățimea, FPS-ul sau mărește valoarea calității și convertește din nou.
            </div>
          )}

          {/* Preview: WebP as <img>, MP4 as <video> */}
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
