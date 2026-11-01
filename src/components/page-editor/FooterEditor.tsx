"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { blockDef } from "@/lib/page-block-schemas";
import { resetFooters } from "@/lib/footer-library-client";
import { FieldsPanel } from "./FieldInputs";

type Obj = Record<string, unknown>;

export interface FooterData {
  id: string;
  name: string;
  block: Obj;
  is_default: boolean;
}

/** Settings of one footer of the library, with the live preview on the right (same renderer as the pages). */
export default function FooterEditor({ initial }: { initial: FooterData }) {
  const router = useRouter();
  const def = blockDef("footer");
  const [name, setName] = useState(initial.name);
  const [block, setBlock] = useState<Obj>(initial.block);
  const [makeDefault, setMakeDefault] = useState(initial.is_default);
  const [saved, setSaved] = useState({ name: initial.name, block: JSON.stringify(initial.block), isDefault: initial.is_default });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const dirty = name !== saved.name || JSON.stringify(block) !== saved.block || makeDefault !== saved.isDefault;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const sendPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "velaro-preview", kind: "landing", blocks: [{ ...block, type: "footer" }], background: "#ffffff", phase: "final", withStoreCta: false },
      window.location.origin,
    );
  }, [block]);

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

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/page-footers/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, block, is_default: makeDefault }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Nu am putut salva." });
      return;
    }
    resetFooters();
    setBlock(data.footer.block);
    setSaved({ name: data.footer.name, block: JSON.stringify(data.footer.block), isDefault: data.footer.is_default });
    setMessage({ type: "success", text: "Salvat. Paginile care folosesc acest footer se actualizează în maximum un minut." });
  }

  async function remove() {
    if (!window.confirm(`Ștergi footerul „${initial.name}”? Paginile care îl foloseau trec pe footerul implicit. Nu se poate anula.`)) return;
    const res = await fetch(`/api/page-footers/${initial.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ type: "error", text: "Nu am putut șterge footerul." });
      return;
    }
    resetFooters();
    router.push("/admin/pages/footers");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pages/footers" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Footere
        </Link>
        <h1 className="text-2xl font-bold text-white">Editează footerul</h1>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-400">Modificări nesalvate</span>}
          <button type="button" onClick={remove} className="rounded-md border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20">
            Șterge
          </button>
          <button type="button" onClick={save} disabled={saving || !dirty} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Se salvează…" : "Salvează"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-md border p-3 text-sm ${message.type === "success" ? "border-emerald-800 bg-emerald-900/20 text-emerald-300" : "border-red-800 bg-red-900/20 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <div>
            <div className="mb-1 text-sm font-medium text-zinc-200">Nume (doar pentru tine)</div>
            <input
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input type="checkbox" checked={makeDefault} disabled={initial.is_default} onChange={(e) => setMakeDefault(e.target.checked)} className="h-4 w-4" />
            Footer implicit
            <span className="text-xs text-zinc-400">
              {initial.is_default ? "(ca să schimbi implicitul, bifează opțiunea pe alt footer)" : "Paginile pe „Footerul implicit” îl vor folosi pe acesta"}
            </span>
          </label>
          <div className="border-t border-zinc-700 pt-4">
            {def && <FieldsPanel fields={def.fields} value={block} onChange={setBlock} />}
          </div>
        </div>

        <div>
          <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-2xl border-4 border-zinc-600 bg-white">
            <iframe ref={iframeRef} src="/page-preview" title="Previzualizare" className="block h-[560px] w-full border-0" />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">Previzualizare pe lățime de telefon.</p>
        </div>
      </div>
    </div>
  );
}
