"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BLOCK_DEFS, NAME_FIELDS, OUT_OF_FLOW_BLOCKS, SPACING_FIELDS, THANK_YOU_VISIBILITY_FIELDS, blockDef, type PageKind } from "@/lib/page-block-schemas";
import { normalizeBlocks } from "@/lib/page-blocks";
import { buildFooterLibrary, EMPTY_FOOTER_LIBRARY, type FooterLibrary } from "@/lib/footer-library";
import { loadFooters } from "@/lib/footer-library-client";
import { FieldsPanel } from "./FieldInputs";
import { uploadPageImage } from "@/lib/upload-page-image-client";
import { sharingDebuggerUrl } from "@/lib/share-preview";
import { insertPosition } from "@/lib/editor-insert";
import { SortableList, SortableRow, arrayMove } from "./SortableList";
import { previewCtaFromStore, type PreviewStore } from "@/lib/thank-you-cta";

type Obj = Record<string, unknown>;
type Item = { id: string; data: Obj };

export interface EditorPageData {
  title: string;
  slug?: string;
  background: string;
  blocks: unknown[];
  status?: "draft" | "published";
  /** Domain the page is served on (null = the application domain, at /p/slug) */
  domainId?: string | null;
  /** The page served at the bare address of its domain */
  isHome?: boolean;
  /** Page width: "narrow" (phone-style column) or "wide" (homepages) */
  layout?: "narrow" | "wide";
  /** Link card (Facebook / WhatsApp): image address, title, description. Empty = automatic */
  shareImageUrl?: string;
  shareTitle?: string;
  shareDescription?: string;
}

export type SaveResult = { ok: true; page?: Partial<EditorPageData> } | { ok: false; error: string };

interface PageEditorProps {
  kind: PageKind;
  initial: EditorPageData;
  onSave: (data: EditorPageData) => Promise<SaveResult>;
  backHref: string;
  backLabel: string;
  /** Public address of the saved page (landing pages only); hostname = the chosen domain, if any */
  publicUrl?: (slug: string, hostname?: string) => string;
  /** Domains the page can be served on (verified ones). When given, a domain selector is shown */
  domains?: { id: string; hostname: string }[];
  /** Only these block types can be added (default: all that fit the page kind) */
  allowedBlocks?: string[];
  /** Address shown before the slug field */
  slugPrefix?: string;
  /** Thank-you page: go back to the built-in default */
  onReset?: () => Promise<SaveResult>;
}

let counter = 0;
const newId = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;
const toItems = (blocks: unknown[]): Item[] =>
  blocks.filter((b): b is Obj => !!b && typeof b === "object").map((data) => ({ id: newId(), data }));

function summary(data: Obj): string {
  const firstItem = Array.isArray(data.items) ? (data.items[0] as Obj | undefined) : undefined;
  const raw = [data.text, data.title, data.heading, data.headline, data.src, data.landingSlug, data.company, data.html, data.offerName, firstItem?.text]
    .find((v) => typeof v === "string" && v.trim() !== "") as string | undefined;
  return raw ? raw.replace(/\s+/g, " ").slice(0, 38) : "";
}

const buttonBase = "rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const iconButton = "rounded border border-zinc-600 px-1.5 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30";

export default function PageEditor({ kind, initial, onSave, backHref, backLabel, publicUrl, domains, allowedBlocks, slugPrefix = "/p/", onReset }: PageEditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [background, setBackground] = useState(initial.background);
  const [domainId, setDomainId] = useState<string | null>(initial.domainId ?? null);
  const [isHome, setIsHome] = useState<boolean>(initial.isHome ?? false);
  const [layout, setLayout] = useState<"narrow" | "wide">(initial.layout ?? "narrow");
  const [shareImageUrl, setShareImageUrl] = useState(initial.shareImageUrl ?? "");
  const [shareTitle, setShareTitle] = useState(initial.shareTitle ?? "");
  const [shareDescription, setShareDescription] = useState(initial.shareDescription ?? "");
  const [shareUploading, setShareUploading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const shareFileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>(() => toItems(normalizeBlocks(initial.blocks)));
  const [status, setStatus] = useState<"draft" | "published">(initial.status ?? "draft");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewPhase, setPreviewPhase] = useState<"offer" | "final">("final");
  const [previewCta, setPreviewCta] = useState(true);
  const [stores, setStores] = useState<PreviewStore[]>([]);
  const [previewStoreId, setPreviewStoreId] = useState("");
  const addMenuRef = useRef<HTMLDetailsElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [blockQuery, setBlockQuery] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [footerLibrary, setFooterLibrary] = useState<FooterLibrary>(EMPTY_FOOTER_LIBRARY);

  useEffect(() => {
    let cancelled = false;
    loadFooters().then((rows) => !cancelled && setFooterLibrary(buildFooterLibrary(rows)));
    return () => {
      cancelled = true;
    };
  }, []);

  // Thank-you page only: the stores, so the preview can show a real store's message and button
  useEffect(() => {
    if (kind !== "thank_you") return;
    let cancelled = false;
    fetch("/api/stores")
      .then((res) => (res.ok ? res.json() : { stores: [] }))
      .then((data) => !cancelled && setStores(Array.isArray(data.stores) ? data.stores : []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const previewStoreCta = useMemo(() => {
    const store = stores.find((s) => s.id === previewStoreId);
    return store ? previewCtaFromStore(store) : undefined;
  }, [stores, previewStoreId]);

  const payload = useMemo(
    () => ({ title, slug, background, blocks: items.map((i) => i.data), ...(domains ? { domainId, isHome: isHome && !!domainId, layout, shareImageUrl, shareTitle, shareDescription } : {}) }),
    [title, slug, background, items, domains, domainId, isHome, layout, shareImageUrl, shareTitle, shareDescription],
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
      { type: "velaro-preview", kind, blocks: payload.blocks, background, layout, phase: previewPhase, withStoreCta: previewCta, cta: previewStoreCta, footerLibrary },
      window.location.origin,
    );
  }, [kind, payload.blocks, background, layout, previewPhase, previewCta, previewStoreCta, footerLibrary]);

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

  // A page is reachable only on its domain: without one it cannot be published
  const needsDomain = kind === "landing" && domains !== undefined && !domainId;
  const available = BLOCK_DEFS.filter((d) => d.kinds.includes(kind) && (!allowedBlocks || allowedBlocks.includes(d.type)));
  // Live search in the add-block menu: ignores case and diacritics, looks in the name and the description
  const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const queryWords = fold(blockQuery).split(/\s+/).filter(Boolean);
  const matching = queryWords.length === 0 ? available : available.filter((d) => queryWords.every((w) => fold(`${d.label} ${d.description}`).includes(w)));
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const selectedDef = selected ? blockDef(selected.data.type) : undefined;

  const addBlock = (type: string) => {
    const def = blockDef(type);
    if (!def) return;
    const item: Item = { id: newId(), data: def.create() };
    const at = insertPosition(items, selectedId, type);
    setItems((prev) => [...prev.slice(0, at), item, ...prev.slice(at)]);
    setSelectedId(item.id);
    if (addMenuRef.current) addMenuRef.current.open = false;
    setBlockQuery("");
  };

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

  const toggleHidden = (id: string) =>
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const { hidden: _hidden, ...rest } = i.data;
        return { ...i, data: i.data.hidden === true ? rest : { ...rest, hidden: true } };
      }),
    );

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
              {domains && (
                <select
                  value={domainId ?? ""}
                  onChange={(e) => {
                    setDomainId(e.target.value || null);
                    // The homepage mark belongs to the old domain
                    setIsHome(false);
                  }}
                  className="mr-1 rounded-md border border-zinc-600 bg-zinc-900 px-2 py-2 text-sm text-white"
                  aria-label="Domeniu"
                >
                  <option value="">Alege domeniul…</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.hostname}
                    </option>
                  ))}
                </select>
              )}
              {domains ? "/" : slugPrefix}
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
            <button
              type="button"
              disabled={saving || needsDomain}
              title={needsDomain ? "Alege un domeniu ca pagina să poată fi publicată" : undefined}
              onClick={() => save("published")}
              className={`${buttonBase} bg-orange-600 text-white hover:bg-orange-700`}
            >
              Publică
            </button>
          ))}
        {kind === "landing" && status === "published" && publicUrl && slug && (
          <a href={publicUrl(slug, domains?.find((d) => d.id === domainId)?.hostname)} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300">
            Vezi pagina ↗
          </a>
        )}
        {onReset && (
          <button type="button" disabled={saving} onClick={reset} className={`${buttonBase} border border-zinc-600 text-zinc-300 hover:bg-zinc-700`}>
            Resetează la implicit
          </button>
        )}
      </div>

      {needsDomain && (
        <div className="rounded-md border border-amber-800 bg-amber-900/20 p-3 text-sm text-amber-200">
          Pagina nu are domeniu, deci nu se afișează nicăieri. Alege un domeniu verificat în câmpul din bara de sus.
        </div>
      )}

      {message && (
        <div className={`rounded-md border p-3 text-sm ${message.type === "success" ? "border-emerald-800 bg-emerald-900/20 text-emerald-400" : "border-red-800 bg-red-900/20 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_420px]">
        {/* Blocks list */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          <details
            ref={addMenuRef}
            className="mb-3"
            onToggle={(e) => {
              if ((e.currentTarget as HTMLDetailsElement).open) searchRef.current?.focus();
              else setBlockQuery("");
            }}
          >
            <summary className={`${buttonBase} cursor-pointer list-none bg-emerald-600 text-center text-white hover:bg-emerald-700`}>＋ Adaugă bloc</summary>
            <input
              ref={searchRef}
              type="search"
              value={blockQuery}
              onChange={(e) => setBlockQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matching[0]) {
                  e.preventDefault();
                  addBlock(matching[0].type);
                } else if (e.key === "Escape" && addMenuRef.current) {
                  addMenuRef.current.open = false;
                }
              }}
              placeholder="Caută bloc…"
              aria-label="Caută bloc"
              className="mt-2 w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-white placeholder:text-zinc-400"
            />
            <div className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 p-1">
              {matching.length === 0 && <p className="px-2 py-3 text-center text-sm text-zinc-400">Niciun bloc găsit</p>}
              {matching.map((def) => (
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

          <SortableList ids={items.map((i) => i.id)} onMove={(from, to) => setItems((prev) => arrayMove(prev, from, to))}>
            <ul className="space-y-1">
              {items.map((item) => {
                const def = blockDef(item.data.type);
                const active = item.id === selectedId;
                return (
                  <SortableRow key={item.id} id={item.id}>
                    {(handle) => (
                      <div
                        className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1.5 ${item.data.hidden === true ? "opacity-60" : ""} ${active ? "border-emerald-500 bg-zinc-700" : "border-zinc-700 bg-zinc-900 hover:bg-zinc-700/60"}`}
                      >
                        {handle}
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          title={typeof item.data.label === "string" && item.data.label ? item.data.label : undefined}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="w-5 text-center text-zinc-300">{def?.icon ?? "?"}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-white">{(typeof item.data.label === "string" && item.data.label) || def?.label || String(item.data.type)}</span>
                            <span className="block truncate text-xs text-zinc-400">{item.data.hidden === true ? "Ascuns · " : ""}{summary(item.data)}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`${iconButton} ${item.data.hidden === true ? "border-amber-600 text-amber-300" : ""}`}
                          onClick={() => toggleHidden(item.id)}
                          title={item.data.hidden === true ? "Ascuns: apasă ca să-l arăți din nou" : "Ascunde blocul (rămâne în pagină, dar nu se vede)"}
                          aria-label={item.data.hidden === true ? "Arată blocul" : "Ascunde blocul"}
                        >
                          {item.data.hidden === true ? "🙈" : "👁"}
                        </button>
                        {active && (
                          <div className="flex gap-1">
                            <button type="button" className={iconButton} onClick={() => duplicate(item.id)} aria-label="Duplică">⧉</button>
                            <button type="button" className={iconButton} onClick={() => remove(item.id)} aria-label="Șterge">🗑</button>
                          </div>
                        )}
                      </div>
                    )}
                  </SortableRow>
                );
              })}
            </ul>
          </SortableList>
        </div>

        {/* Settings */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          {selected && selectedDef ? (
            <>
              <h2 className="mb-4 text-lg font-semibold text-white">
                {selectedDef.icon} {selectedDef.label}
              </h2>
              <div className="mb-4">
                <FieldsPanel fields={NAME_FIELDS} value={selected.data} onChange={updateSelected} />
              </div>
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
              <FieldsPanel key={selected.id} fields={selectedDef.fields} value={selected.data} onChange={updateSelected} />
              {!OUT_OF_FLOW_BLOCKS.includes(selectedDef.type) && (
                <div className="mt-6 border-t border-zinc-700 pt-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Spațiere</h3>
                  <FieldsPanel fields={SPACING_FIELDS} value={selected.data} onChange={updateSelected} />
                </div>
              )}
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
              {domains && (
                <div className="mt-5 space-y-4 border-t border-zinc-700 pt-4">
                  <div>
                    <div className="mb-1 text-sm font-medium text-zinc-200">Lățimea paginii</div>
                    <select value={layout} onChange={(e) => setLayout(e.target.value as "narrow" | "wide")} className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white">
                      <option value="narrow">Îngustă (coloană ca pe telefon, 560 px)</option>
                      <option value="wide">Largă (până la 1200 px, pentru pagina de pornire)</option>
                    </select>
                    <p className="mt-1 text-xs text-zinc-400">Pe telefon arată la fel. Diferența se vede pe desktop.</p>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-zinc-200">
                    <input type="checkbox" checked={isHome && !!domainId} disabled={!domainId} onChange={(e) => setIsHome(e.target.checked)} className="mt-0.5 h-4 w-4" />
                    <span>
                      Pagina de pornire a domeniului
                      <span className="block text-xs text-zinc-400">
                        {domainId ? "Se afișează la adresa domeniului (fără slug). Pe un domeniu poate fi o singură pagină de pornire: bifarea o înlocuiește pe cea veche." : "Alege mai întâi un domeniu în bara de sus."}
                      </span>
                    </span>
                  </label>
                  <div className="border-t border-zinc-700 pt-4">
                    <div className="mb-1 text-sm font-medium text-zinc-200">La distribuire (Facebook, WhatsApp)</div>
                    <p className="mb-3 text-xs text-zinc-400">Cum arată linkul paginii când e trimis sau postat. Dacă lași câmpurile goale, imaginea e prima poză din pagină (fără pozele de la comentarii), iar titlul e titlul paginii.</p>
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 text-xs text-zinc-300">Imagine (se decupează la 1200×630)</div>
                        <div className="flex gap-2">
                          <input
                            value={shareImageUrl}
                            onChange={(e) => setShareImageUrl(e.target.value)}
                            placeholder="https://… sau încarcă un fișier"
                            className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
                          />
                          <button
                            type="button"
                            disabled={shareUploading}
                            onClick={() => shareFileRef.current?.click()}
                            className="shrink-0 whitespace-nowrap rounded-md border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                          >
                            {shareUploading ? "Se încarcă…" : "Încarcă"}
                          </button>
                        </div>
                        <input
                          ref={shareFileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setShareError(null);
                            setShareUploading(true);
                            try {
                              setShareImageUrl((await uploadPageImage(file, 1200, true)).url);
                            } catch (err) {
                              setShareError(err instanceof Error ? err.message : "Încărcarea a eșuat");
                            } finally {
                              setShareUploading(false);
                            }
                          }}
                        />
                        {shareError && <p className="mt-1 text-xs text-red-400">{shareError}</p>}
                        {/^https?:\/\//i.test(shareImageUrl) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={shareImageUrl} alt="" className="mt-2 aspect-[1.91/1] w-full rounded border border-zinc-700 bg-zinc-900 object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-zinc-300">Titlu (gol = titlul paginii)</div>
                        <input value={shareTitle} maxLength={90} onChange={(e) => setShareTitle(e.target.value)} className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-zinc-300">Descriere (opțional)</div>
                        <textarea value={shareDescription} maxLength={200} rows={2} onChange={(e) => setShareDescription(e.target.value)} className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white" />
                      </div>
                      {domainId && (
                        <a
                          href={sharingDebuggerUrl(publicUrl?.(slug, domains.find((d) => d.id === domainId)?.hostname) ?? "")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm text-emerald-400 hover:text-emerald-300"
                        >
                          Reîmprospătează preview-ul în Facebook →
                        </a>
                      )}
                      <p className="text-xs text-zinc-400">Facebook păstrează preview-ul în cache. După ce schimbi imaginea, salvează pagina, apoi apasă linkul de mai sus și „Scrape again”.</p>
                    </div>
                  </div>
                </div>
              )}
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
                Magazin:
                <select value={previewStoreId} onChange={(e) => setPreviewStoreId(e.target.value)} className="max-w-[160px] rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-white">
                  <option value="">Exemplu</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.url || s.id}
                    </option>
                  ))}
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
