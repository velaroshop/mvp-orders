"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetFooters } from "@/lib/footer-library-client";

interface FooterRow {
  id: string;
  name: string;
  is_default: boolean;
  usage: number;
  updated_at: string;
}

export default function FootersList() {
  const router = useRouter();
  const [footers, setFooters] = useState<FooterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/page-footers");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(res.status === 403 ? "Această secțiune e doar pentru superadmin." : data.error || "Nu am putut încărca footerele.");
    } else {
      setFooters(data.footers ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(footerName: string, duplicateFrom?: string) {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/page-footers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: footerName, duplicateFrom }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Nu am putut crea footerul.");
      return;
    }
    resetFooters();
    router.push(`/admin/pages/footers/${data.footer.id}`);
  }

  async function duplicate(footer: FooterRow) {
    const input = window.prompt("Numele copiei:", `${footer.name} (copie)`);
    if (input && input.trim()) await create(input.trim(), footer.id);
  }

  async function remove(footer: FooterRow) {
    const used = footer.usage > 0 ? ` Este folosit pe ${footer.usage} ${footer.usage === 1 ? "pagină" : "pagini"}, care trec pe footerul implicit.` : "";
    const note = footer.is_default ? " Fiind implicit, cel mai vechi footer rămas devine implicit." : "";
    if (!window.confirm(`Ștergi footerul „${footer.name}”?${used}${note} Nu se poate anula.`)) return;
    const res = await fetch(`/api/page-footers/${footer.id}`, { method: "DELETE" });
    if (res.ok) {
      resetFooters();
      load();
    } else {
      setError("Nu am putut șterge footerul.");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/pages" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Pagini proprii
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-white">Footere</h1>
        <p className="mt-2 text-zinc-400">
          Footerele paginilor proprii se fac o singură dată aici și se aleg din editor, cu blocul „Footer comun”. Footerul implicit se folosește când pagina nu alege altul.
        </p>
      </div>

      {error && <div className="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create(name.trim());
        }}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-200">Nume footer nou</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="REDUXIO" required className="w-64 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white" />
        </div>
        <button type="submit" disabled={creating} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {creating ? "Se creează…" : "Creează footer"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
        {loading ? (
          <p className="p-6 text-center text-zinc-400">Se încarcă…</p>
        ) : footers.length === 0 ? (
          <p className="p-6 text-center text-zinc-400">Nu ai încă niciun footer. Primul creat devine footerul implicit.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-700 bg-zinc-900 text-left text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-3">Footer</th>
                <th className="px-4 py-3">Folosit pe</th>
                <th className="px-4 py-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {footers.map((footer) => (
                <tr key={footer.id} className="hover:bg-zinc-700/40">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{footer.name}</span>
                    {footer.is_default && <span className="ml-2 rounded-full bg-emerald-900/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">Implicit</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{footer.usage === 0 ? "—" : `${footer.usage} ${footer.usage === 1 ? "pagină" : "pagini"}`}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/pages/footers/${footer.id}`} className="mr-4 text-emerald-400 hover:text-emerald-300">
                      Editează
                    </Link>
                    <button type="button" onClick={() => duplicate(footer)} className="mr-4 text-zinc-300 hover:text-white">
                      Duplică
                    </button>
                    <button type="button" onClick={() => remove(footer)} className="text-red-400 hover:text-red-300">
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
