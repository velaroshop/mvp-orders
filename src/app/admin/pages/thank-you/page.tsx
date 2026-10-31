"use client";

import { useEffect, useState } from "react";
import PageEditor, { type EditorPageData, type SaveResult } from "@/components/page-editor/PageEditor";

export default function EditThankYouPage() {
  const [initial, setInitial] = useState<EditorPageData | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/thank-you-page")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 403 ? "Această secțiune e doar pentru superadmin." : data.error || "Pagina nu a putut fi încărcată.");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setIsDefault(!!data.isDefault);
        setInitial({
          title: "",
          background: data.page.background ?? "#0f172a",
          blocks: Array.isArray(data.page.blocks) ? data.page.blocks : [],
        });
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Eroare"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(data: EditorPageData): Promise<SaveResult> {
    const res = await fetch("/api/thank-you-page", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ background: data.background, blocks: data.blocks }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setIsDefault(false);
    return res.ok ? { ok: true } : { ok: false, error: body.error || "Nu am putut salva." };
  }

  async function reset(): Promise<SaveResult> {
    const res = await fetch("/api/thank-you-page", { method: "DELETE" });
    return res.ok ? { ok: true } : { ok: false, error: "Nu am putut reseta pagina." };
  }

  if (error) return <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-red-400">{error}</div>;
  if (!initial) return <p className="text-zinc-400">Se încarcă pagina…</p>;

  return (
    <div className="space-y-3">
      {isDefault && (
        <div className="rounded-md border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-300">
          Acum se folosește pagina implicită. Ce salvezi aici o înlocuiește pentru toate comenzile.
        </div>
      )}
      <PageEditor kind="thank_you" initial={initial} onSave={save} onReset={reset} backHref="/admin/pages" backLabel="Pagini proprii" />
    </div>
  );
}
