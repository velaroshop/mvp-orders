"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageEditor, { type EditorPageData, type SaveResult } from "@/components/page-editor/PageEditor";

export default function EditOwnPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<EditorPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<{ id: string; hostname: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/own-pages/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 403 ? "Această secțiune e doar pentru superadmin." : data.error || "Pagina nu a putut fi încărcată.");
        return data.page;
      })
      .then((page) => {
        if (cancelled) return;
        setInitial({
          title: page.title ?? "",
          slug: page.slug,
          background: page.background ?? "#ffffff",
          blocks: Array.isArray(page.blocks) ? page.blocks : [],
          status: page.status,
          domainId: page.domain_id ?? null,
          isHome: page.is_home === true,
          layout: page.layout === "wide" ? "wide" : "narrow",
        });
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Eroare"));
    fetch("/api/domains")
      .then((res) => (res.ok ? res.json() : { domains: [] }))
      .then((data) => {
        if (!cancelled) setDomains((data.domains ?? []).filter((d: { status: string }) => d.status === "verified" || d.status === "active"));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save(data: EditorPageData): Promise<SaveResult> {
    const res = await fetch(`/api/own-pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.title, slug: data.slug, background: data.background, blocks: data.blocks, status: data.status, domainId: data.domainId, isHome: data.isHome, layout: data.layout }),
    });
    const body = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: body.error || "Nu am putut salva." };
  }

  if (error) return <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-red-400">{error}</div>;
  if (!initial) return <p className="text-zinc-400">Se încarcă pagina…</p>;

  return <PageEditor kind="landing" initial={initial} onSave={save} backHref="/admin/pages" backLabel="Pagini proprii" publicUrl={(slug, hostname) => (hostname ? `https://${hostname}/${slug}` : "#")} domains={domains} />;
}
