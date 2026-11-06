"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  domain_id: string | null;
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
  // Verified domains (the only places a page can live)
  const [domains, setDomains] = useState<{ id: string; hostname: string }[]>([]);
  const [domainsLoaded, setDomainsLoaded] = useState(false);
  const [domainId, setDomainId] = useState("");
  const [deleting, setDeleting] = useState<PageRow | null>(null);
  const [deleteWord, setDeleteWord] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const domainNames = Object.fromEntries(domains.map((d) => [d.id, d.hostname]));

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
    fetch("/api/domains")
      .then((res) => (res.ok ? res.json() : { domains: [] }))
      .then((data) => {
        const usable = (data.domains ?? []).filter((d: { status: string }) => d.status === "verified" || d.status === "active");
        setDomains(usable);
        setDomainId((current) => current || usable[0]?.id || "");
      })
      .catch(() => {})
      .finally(() => setDomainsLoaded(true));
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/own-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, domainId }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Nu am putut crea pagina.");
      return;
    }
    router.push(`/admin/pages/${data.page.id}`);
  }

  async function duplicate(page: PageRow) {
    const targetDomain = page.domain_id && domainNames[page.domain_id] ? page.domain_id : domains[0]?.id;
    if (!targetDomain) {
      setError("Mai întâi adaugă și verifică un domeniu.");
      return;
    }
    const input = window.prompt(`Slug pentru copie (adresa ${domainNames[targetDomain]}/…):`, `${page.slug}-2`);
    if (!input) return;
    const res = await fetch("/api/own-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: input.trim().toLowerCase(), title: `${page.title || page.slug} (copie)`, duplicateFrom: page.id, domainId: targetDomain }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Nu am putut duplica pagina.");
      return;
    }
    router.push(`/admin/pages/${data.page.id}`);
  }

  async function confirmRemove() {
    if (!deleting || deleteWord.trim().toUpperCase() !== "STERGE") return;
    setDeleteBusy(true);
    const res = await fetch(`/api/own-pages/${deleting.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (res.ok) setPages((prev) => prev.filter((p) => p.id !== deleting.id));
    else setError("Nu am putut șterge pagina.");
    setDeleting(null);
    setDeleteWord("");
  }

  function closeDelete() {
    if (deleteBusy) return;
    setDeleting(null);
    setDeleteWord("");
  }

  const dateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors";

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Pagini proprii</h1>
        <p className="mt-2 text-zinc-400">Pagini de vânzare construite din blocuri, servite pe domeniile tale verificate, la domeniu/slug. Doar pentru superadmin.</p>
        <Link href="/admin/pages/stats" className="mt-2 inline-block text-sm font-medium text-sky-300 underline hover:text-sky-200">
          Statistici (vizite, formular, comenzi) →
        </Link>
      </div>

      {error && <div className="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>}

      {domainsLoaded && domains.length === 0 && (
        <div className="rounded-md border border-amber-800 bg-amber-900/20 p-4 text-sm text-amber-200">
          <strong>Pasul 1: adaugă un domeniu.</strong> Paginile se creează și se afișează doar pe un domeniu verificat și conectat. Până atunci nu poți crea pagini.{" "}
          <Link href="/admin/pages/domains" className="font-medium underline hover:text-amber-100">
            Deschide domeniile →
          </Link>
        </div>
      )}

      <form onSubmit={create} className={`flex flex-wrap items-end gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-4 ${domains.length === 0 ? "pointer-events-none opacity-50" : ""}`}>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-200">Domeniu</label>
          <select value={domainId} onChange={(e) => setDomainId(e.target.value)} required className="w-56 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white">
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.hostname}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-200">Titlu</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SlimGel" className="w-56 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-200">Slug (adresa /…)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="slimgel-2"
            required
            className="w-56 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
          />
        </div>
        <button type="submit" disabled={creating || domains.length === 0} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
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
              {pages.map((page) => {
                const host = page.domain_id ? domainNames[page.domain_id] : undefined;
                const url = host ? `https://${host}/${page.slug}` : null;
                const published = page.status === "published";
                return (
                  <tr key={page.id} className={`hover:bg-zinc-700/40 ${published ? "" : "opacity-80"}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 font-medium text-white">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${published ? "bg-emerald-400" : "bg-zinc-400"}`} />
                        {page.title || page.slug}
                      </div>
                      <div className="mt-0.5 pl-4 text-xs text-zinc-300">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
                            {host}/{page.slug}
                          </a>
                        ) : (
                          <span className="text-amber-400">fără domeniu: nu se afișează nicăieri ({page.slug})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${published ? "bg-emerald-900/50 text-emerald-300" : "bg-zinc-700 text-zinc-300"}`}>
                        {published ? "Publicat" : "Ciornă"}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-zinc-300">{dateFmt.format(new Date(page.updated_at))}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {url && published ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" title="Vizualizează pagina" aria-label="Vizualizează pagina" className={`${iconBtn} text-sky-300 hover:bg-zinc-700 hover:text-sky-200`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span title={url ? "Publică întâi pagina" : "Pagina nu are domeniu"} className={`${iconBtn} cursor-not-allowed text-zinc-400 opacity-50`}>
                            <ExternalLink className="h-4 w-4" />
                          </span>
                        )}
                        <Link href={`/admin/pages/${page.id}`} title="Editează" aria-label="Editează" className={`${iconBtn} text-emerald-400 hover:bg-zinc-700 hover:text-emerald-300`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button type="button" onClick={() => duplicate(page)} title="Duplică" aria-label="Duplică" className={`${iconBtn} text-zinc-300 hover:bg-zinc-700 hover:text-white`}>
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleting(page);
                            setDeleteWord("");
                          }}
                          title="Șterge"
                          aria-label="Șterge"
                          className={`${iconBtn} text-red-400 hover:bg-zinc-700 hover:text-red-300`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white">Domenii</h2>
        <p className="mt-1 text-sm text-zinc-400">Domeniile pe care se vor afișa paginile proprii, cu verificarea proprietății.</p>
        <Link href="/admin/pages/domains" className="mt-3 inline-block rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          Deschide domeniile
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white">Pagini legale</h2>
        <p className="mt-1 text-sm text-zinc-400">Termeni, confidențialitate, retur: se scriu o singură dată și se afișează pe toate domeniile organizației.</p>
        <Link href="/admin/pages/legal" className="mt-3 inline-block rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          Deschide paginile legale
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white">Footere</h2>
        <p className="mt-1 text-sm text-zinc-400">Footerele se fac o singură dată și se aleg pe fiecare pagină, cu blocul „Footer comun”.</p>
        <Link href="/admin/pages/footers" className="mt-3 inline-block rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          Deschide footerele
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white">Pagina de mulțumire</h2>
        <p className="mt-1 text-sm text-zinc-400">O singură pagină, la /thank-you, folosită după orice comandă făcută pe paginile proprii.</p>
        <Link href="/admin/pages/thank-you" className="mt-3 inline-block rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          Editează pagina de mulțumire
        </Link>
      </div>

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeDelete}>
          <div className="w-full max-w-md rounded-lg border border-zinc-600 bg-zinc-800 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white">Ștergi pagina „{deleting.title || deleting.slug}”?</h2>
            <p className="mt-2 text-sm text-zinc-300">Nu se poate anula. Scrie <strong className="text-white">STERGE</strong> ca să confirmi.</p>
            <input
              autoFocus
              value={deleteWord}
              onChange={(e) => setDeleteWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmRemove()}
              placeholder="STERGE"
              className="mt-3 w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeDelete} className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
                Anulează
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={deleteBusy || deleteWord.trim().toUpperCase() !== "STERGE"}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleteBusy ? "Se șterge…" : "Șterge definitiv"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
