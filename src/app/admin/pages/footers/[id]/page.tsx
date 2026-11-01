"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FooterEditor, { type FooterData } from "@/components/page-editor/FooterEditor";

export default function EditFooterPage() {
  const { id } = useParams<{ id: string }>();
  const [footer, setFooter] = useState<FooterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/page-footers/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 403 ? "Această secțiune e doar pentru superadmin." : data.error || "Footerul nu a putut fi încărcat.");
        return data.footer;
      })
      .then((f) => !cancelled && setFooter({ id: f.id, name: f.name, block: f.block && typeof f.block === "object" ? f.block : {}, is_default: !!f.is_default }))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Eroare"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-red-400">{error}</div>;
  if (!footer) return <p className="text-zinc-400">Se încarcă footerul…</p>;
  return <FooterEditor initial={footer} />;
}
