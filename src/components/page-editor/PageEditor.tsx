"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BLOCK_DEFS, THANK_YOU_VISIBILITY_FIELDS, blockDef, type PageKind } from "@/lib/page-block-schemas";
import { FieldsPanel } from "./FieldInputs";

type Obj = Record<string, unknown>;
type Item = { id: string; data: Obj };

export interface EditorPageData {
  title: string;
  slug?: string;
  background: string;
  blocks: unknown[];
  status?: "draft" | "published";
}

export type SaveResult = { ok: true; page?: Partial<EditorPageData> } | { ok: false; error: string };

interface PageEditorProps {
  kind: PageKind;
  initial: EditorPageData;
  onSave: (data: EditorPageData) => Promise<SaveResult>;
  backHref: string;
  backLabel: string;
  /** Public address of the saved page (landing pages only) */
  publicUrl?: (slug: string) => string;
  /** Thank-you page: go back to the built-in default */
  onReset?: () => Promise<SaveResult>;
}

let counter = 0;
const newId = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;
const toItems = (blocks: unknown[]): Item[] =>
  blocks.filter((b): b is Obj => !!b && typeof b === "object").map((data) => ({ id: newId(), data }));

function summary(data: Obj): string {
  const raw = [data.text, data.title, data.heading, data.headline, data.src, data.landingSlug, data.company, data.html]
    .find((v) => typeof v === "string" && v.trim() !== "") as string | undefined;
  return raw ? raw.replace(/\s+/g, " ").slice(0, 38) : "";
}

const buttonBase = "rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const iconButton = "rounded border border-zinc-600 px-1.5 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30";

export default function PageEditor({ kind, initial, onSave, backHref, backLabel, publicUrl, onReset }: PageEditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [background, setBackground] = useState(initial.background);
  const [items, setItems] = useState<Item[]>(() => toItems(initial.blocks));
  const [status, setStatus] = useState<"draft" | "published">(initial.status ?? "draft");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewPhase, setPreviewPhase] = useState<"offer" | "final">("final");
  const [previewCta, setPreviewCta] = useState(true);
  const addMenuRef = useRef<HTMLDetailsElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const payload = useMemo(
    () => ({ title, slug, background, blocks: items.map((i) => i.data) }),
    [title, slug, background, items],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(payload));
  const dirty = JSON.stringify(payload) !== savedSnapshot;

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Live preview: the page being edited is sent to the preview frame (same origin) on every change
  const sendPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "velaro-preview", kind, blocks: payload.blocks, background, phase: previewPhase, withStoreCta: previewCta },
      window.location.origin,
    );
  }, [kind, payload.blocks, background, previewPhase, previewCta]);

  useEffect(() => {
    sendPreview();
  }, [sendPreview]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === "velaro-preview-ready") sendPreview();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendPreview]);

  const available = BLOCK_DEFS.filter((d) => d.kinds.includes(kind));
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const selectedDef = selected ? blockDef(selected.data.type) : undefined;

  const addBlock = (type: string) => {
    const def = blockDef(type);
    if (!def) return;
    const item: Item = { id: newId(), data: def.create() };
    const at = selectedId ? items.findIndex((i) => i.id === selectedId) + 1 : items.length;
    setItems((prev) => [...prev.slice(0, at), item, ...prev.slice(at)]);
    setSelectedId(item.id);
    if (addMenuRef.current) addMenuRef.current.open = false;
  };

  const move = (id: string, delta: number) =>
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const duplicate = (id: string) => {
    const from = items.findIndex((i) => i.id === id);
    if (from < 0) return;
    const copy: Item = { id: newId(), data: JSON.parse(JSON.stringify(items[from].data)) };
    setItems([...items.slice(0, from + 1), copy, ...items.slice(from + 1)]);
    setSelectedId(copy.id);
  };

  const remove = (id: string) => {
    if (!window.confirm("Ștergi blocul?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const updateSelected = (data: Obj) => setItems((prev) => prev.map((i) => (i.id === selectedId ? { ...i, data } : i)));

  const save = async (nextStatus?: "draft" | "published") => {
    setSaving(true);
    setMessage(null);
    const statusToSave = nextStatus ?? status;
    const result = await onSave({ ...payload, status: kind === "landing" ? statusToSave : undefined });
    setSaving(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    if (kind === "landing") setStatus(statusToSave);
    setSavedSnapshot(JSON.stringify(payload));
    setMessage({
      type: "success",
      text: nextStatus === "published" ? "Pagina e publicată." : nextStatus === "draft" ? "Pagina a fost retrasă (ciornă)." : "Salvat.",
    });
  };

  const reset = async () => {
    if (!onReset || !window.confirm("Revii la pagina implicită? Modificările salvate se pierd.")) return;
    setSaving(true);
    const result = await onReset();
    setSaving(false);
    setMessage(result.ok ? { type: "success", text: "Pagina e din nou cea implicită. Reîncarcă pagina ca să o vezi în editor." } : { type: "error", text: result.error });
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
        <Link href={backHref} className="text-sm text-emerald-400 hover:text-emerald-300">
          ← {backLabel}
        </Link>
        {kind === "landing" ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titlul paginii"
              className="min-w-[160px] flex-1 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
            <div className="flex items-center gap-1 text-sm text-zinc-400">
              /p/
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                className="w-40 rounded-md border border-zinc-600 bg-zinc-900 px-2 py-2 text-sm text-white"
                aria-label="Slug"
              />
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "published" ? "bg-emerald-900/50 text-emerald-300" : "bg-zinc-700 text-zinc-300"}`}>
              {status === "published" ? "Publicat" : "Ciornă"}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm font-semibold text-white">Pagina de mulțumire (una singură, pentru toate comenzile)</span>
        )}
        {dirty && <span className="text-xs text-amber-400">Modificări nesalvate</span>}
        <button type="button" disabled={saving || !dirty} onClick={() => save()} className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`}>
          {saving ? "Se salvează…" : "Salvează"}
        </button>
        {kind === "landing" &&
          (status === "published" ? (
            <button type="button" disabled={saving} onClick={() => save("draft")} className={`${buttonBase} border border-zinc-600 text-zinc-200 hover:bg-zinc-700`}>
              Retrage
            </button>
          ) : (
            <button type="button" disabled={saving} onClick={() => save("published")} className={`${buttonBase} bg-orange-600 text-white hover:bg-orange-700`}>
              Publică
            </button>
          ))}
        {kind === "landing" && status === "published" && publicUrl && slug && (
          <a href={publicUrl(slug)} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300">
            Vezi pagina ↗
          </a>
        )}
        {onReset && (
          <button type="button" disabled={saving} onClick={reset} className={`${buttonBase} border border-zinc-600 text-zinc-300 hover:bg-zinc-700`}>
            Resetează la implicit
          </button>
        )}
      </div>

      {message && (
        <div className={`rounded-md border p-3 text-sm ${message.type === "success" ? "border-emerald-800 bg-emerald-900/20 text-emerald-400" : "border-red-800 bg-red-900/20 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_420px]">
        {/* Blocks list */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <details ref={addMenuRef} className="mb-3">
            <summary className={`${buttonBase} cursor-pointer list-none bg-emerald-600 text-center text-white hover:bg-emerald-700`}>＋ Adaugă bloc</summary>
            <div className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 p-1">
              {available.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => addBlock(def.type)}
                  className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-zinc-700"
                >
                  <span className="w-5 text-center text-zinc-300">{def.icon}</span>
                  <span>
                    <span className="block text-sm text-white">{def.label}</span>
                    <span className="block text-xs text-zinc-400">{def.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </details>

          {items.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Pagina e goală. Adaugă primul bloc.</p>}

          <ul className="space-y-1">
            {items.map((item, index) => {
              const def = blockDef(item.data.type);
              const active = item.id === selectedId;
              return (
                <li key={item.id}>
                  <div
                    className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${active ? "border-emerald-500 bg-zinc-700" : "border-zinc-700 bg-zinc-900 hover:bg-zinc-700/60"}`}
                  >
                    <button type="button" onClick={() => setSelectedId(item.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="w-5 text-center text-zinc-300">{def?.icon ?? "?"}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-white">{def?.label ?? String(item.data.type)}</span>
                        <span className="block truncate text-xs text-zinc-400">{summary(item.data)}</span>
                      </span>
                    </button>
                    {active && (
                      <div className="flex gap-1">
                        <button type="button" className={iconButton} disabled={index === 0} onClick={() => move(item.id, -1)} aria-label="Mută sus">↑</button>
                        <button type="button" className={iconButton} disabled={index === items.length - 1} onClick={() => move(item.id, 1)} aria-label="Mută jos">↓</button>
                        <button type="button" className={iconButton} onClick={() => duplicate(item.id)} aria-label="Duplică">⧉</button>
                        <button type="button" className={iconButton} onClick={() => remove(item.id)} aria-label="Șterge">🗑</button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Settings */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          {selected && selectedDef ? (
            <>
              <h2 className="mb-4 text-lg font-semibold text-white">
                {selectedDef.icon} {selectedDef.label}
              </h2>
              {selectedDef.note && (
                <div className="mb-4 rounded-md border border-sky-800 bg-sky-900/20 p-3 text-sm text-sky-200">
                  {selectedDef.note.text}
                  {selectedDef.note.href && (
                    <Link href={selectedDef.note.href} className="mt-2 block font-medium text-sky-300 underline hover:text-sky-200">
                      {selectedDef.note.linkLabel ?? "Deschide"} →
                    </Link>
                  )}
                </div>
              )}
              {selectedDef.fields.length === 0 && !selectedDef.note && <p className="mb-4 text-sm text-zinc-400">Acest bloc nu are setări.</p>}
              <FieldsPanel fields={selectedDef.fields} value={selected.data} onChange={updateSelected} />
              {kind === "thank_you" && (
                <div className="mt-6 border-t border-zinc-700 pt-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Când se afișează</h3>
                  <FieldsPanel fields={THANK_YOU_VISIBILITY_FIELDS} value={selected.data} onChange={updateSelected} />
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold text-white">Setările paginii</h2>
              <div className="mb-1 text-sm font-medium text-zinc-200">Culoarea de fundal a paginii</div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(background) ? background : "#ffffff"}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-zinc-600 bg-zinc-900"
                />
                <input value={background} onChange={(e) => setBackground(e.target.value)} className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white" />
              </div>
              <p className="mt-4 text-sm text-zinc-400">Alege un bloc din listă ca să-i modifici setările.</p>
            </>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          {kind === "thank_you" && (
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              <label className="flex items-center gap-1.5">
                Faza:
                <select value={previewPhase} onChange={(e) => setPreviewPhase(e.target.value as "offer" | "final")} className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-white">
                  <option value="final">După ofertă</option>
                  <option value="offer">Oferta deschisă</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={previewCta} onChange={(e) => setPreviewCta(e.target.checked)} />
                Buton spre magazin activ
              </label>
            </div>
          )}
          <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-2xl border-4 border-zinc-600 bg-white">
            <iframe ref={iframeRef} src="/page-preview" title="Previzualizare" className="block h-[720px] w-full border-0" />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">Previzualizare pe lățime de telefon. Formularul real nu se încarcă aici.</p>
        </div>
      </div>
    </div>
  );
}
