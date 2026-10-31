"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  updated_at: string;
}

export default function OwnPagesList() {
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/own-pages");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(res.status === 403 ? "Această secțiune e doar pentru superadmin." : data.error || "Nu am putut încărca paginile.");
    } else {
      setPages(data.pages ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/own-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Nu am putut crea pagina.");
      return;
    }
    router.push(`/admin/pages/${data.page.id}`);
  }

  async function remove(page: PageRow) {
    if (!window.confirm(`Ștergi pagina „${page.title}” (/p/${page.slug})? Nu se poate anula.`)) return;
    const res = await fetch(`/api/own-pages/${page.id}`, { method: "DELETE" });
    if (res.ok) setPages((prev) => prev.filter((p) => p.id !== page.id));
    else setError("Nu am putut șterge pagina.");
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Pagini proprii</h1>
        <p className="mt-2 text-zinc-400">Pagini de vânzare construite din blocuri, servite la /p/slug. Doar pentru superadmin.</p>
      </div>

      {error && <div className="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>}

      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-200">Titlu</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SlimGel" className="w-56 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-200">Slug (adresa /p/…)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="slimgel-2"
            required
            className="w-56 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
          />
        </div>
        <button type="submit" disabled={creating} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {creating ? "Se creează…" : "Creează pagină"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
        {loading ? (
          <p className="p-6 text-center text-zinc-400">Se încarcă…</p>
        ) : pages.length === 0 ? (
          <p className="p-6 text-center text-zinc-400">Nu ai încă nicio pagină proprie.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-700 bg-zinc-900 text-left text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-3">Pagină</th>
                <th className="px-4 py-3">Stare</th>
                <th className="px-4 py-3">Modificată</th>
                <th className="px-4 py-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-zinc-700/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{page.title || page.slug}</div>
                    <div className="text-xs text-zinc-400">/p/{page.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${page.status === "published" ? "bg-emerald-900/50 text-emerald-300" : "bg-zinc-700 text-zinc-300"}`}>
                      {page.status === "published" ? "Publicat" : "Ciornă"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{new Date(page.updated_at).toLocaleString("ro-RO")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/pages/${page.id}`} className="mr-4 text-emerald-400 hover:text-emerald-300">
                      Editează
                    </Link>
                    <button type="button" onClick={() => remove(page)} className="text-red-400 hover:text-red-300">
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white">Pagina de mulțumire</h2>
        <p className="mt-1 text-sm text-zinc-400">O singură pagină, la /thank-you, folosită după orice comandă făcută pe paginile proprii.</p>
        <Link href="/admin/pages/thank-you" className="mt-3 inline-block rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          Editează pagina de mulțumire
        </Link>
      </div>
    </div>
  );
}
