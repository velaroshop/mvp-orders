"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PageEditor, { type EditorPageData, type SaveResult } from "@/components/page-editor/PageEditor";

// Blocks that make sense on a legal page
const LEGAL_BLOCKS = ["rich_text", "text", "list", "image", "button", "spacer", "topbar", "shared_footer", "footer"];

export default function EditLegalPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<EditorPageData | null>(null);
  const { data: session } = useSession();
  const user = session?.user as { activeOrganizationId?: string; organizations?: { id: string; slug?: string }[] } | undefined;
  const orgSlug = user?.organizations?.find((o) => o.id === user.activeOrganizationId)?.slug || "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/legal-pages/${id}`)
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
        });
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Eroare"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save(data: EditorPageData): Promise<SaveResult> {
    const res = await fetch(`/api/legal-pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.title, slug: data.slug, background: data.background, blocks: data.blocks, status: data.status }),
    });
    const body = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: body.error || "Nu am putut salva." };
  }

  if (error) return <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-red-400">{error}</div>;
  if (!initial) return <p className="text-zinc-400">Se încarcă pagina…</p>;

  return (
    <PageEditor
      kind="landing"
      initial={initial}
      onSave={save}
      backHref="/admin/pages/legal"
      backLabel="Pagini legale"
      allowedBlocks={LEGAL_BLOCKS}
      slugPrefix="/"
      publicUrl={(slug) => `/legal/${orgSlug}/${slug}`}
    />
  );
}
