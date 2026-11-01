"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface DomainRow {
  id: string;
  hostname: string;
  status: "pending" | "verified" | "active";
  verified_at: string | null;
  vercel_added: boolean;
  root_redirect: string | null;
  record: { name: string; value: string };
}

interface ConnectionInfo {
  dns: { type: "A" | "CNAME"; name: string; value: string } | null;
  vercelChallenge: { type: string; domain: string; value: string } | null;
}


const STATUS_LABEL = { pending: "Neverificat", verified: "Verificat", active: "Activ" } as const;
const STATUS_STYLE = {
  pending: "bg-amber-900/40 text-amber-300",
  verified: "bg-sky-900/40 text-sky-300",
  active: "bg-emerald-900/50 text-emerald-300",
} as const;

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-400">{label}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200">{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="shrink-0 rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          {copied ? "Copiat" : "Copiază"}
        </button>
      </div>
    </div>
  );
}

/** Where the bare address of the domain (comanda.firma.ro/) goes: usually the main site */
function RootRedirect({ domain, onSaved }: { domain: DomainRow; onSaved: (value: string | null) => void }) {
  const [value, setValue] = useState(domain.root_redirect ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  const dirty = value.trim() !== (domain.root_redirect ?? "");

  async function save() {
    setState("saving");
    const res = await fetch(`/api/domains/${domain.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rootRedirect: value }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState(data.error || "Nu am putut salva.");
      return;
    }
    onSaved(data.rootRedirect ?? null);
    setValue(data.rootRedirect ?? "");
    setState("saved");
  }

  return (
    <div className="border-t border-zinc-700 pt-3">
      <label className="mb-1 block text-xs text-zinc-400">Adresa de bază a domeniului ({domain.hostname}/) trimite la</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
          placeholder="https://reduxio.ro"
          className="w-72 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-white"
        />
        <button type="button" onClick={save} disabled={!dirty || state === "saving"} className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">
          Salvează
        </button>
        {state === "saved" && <span className="text-xs text-emerald-300">Salvat</span>}
        {state !== "idle" && state !== "saving" && state !== "saved" && <span className="text-xs text-red-400">{state}</span>}
      </div>
      <p className="mt-1 text-xs text-zinc-400">Aici ajung și adresele care nu există sau nu sunt publicate. Gol = 404. Paginile se află la {domain.hostname}/numele-paginii.</p>
    </div>
  );
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState("");
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [connections, setConnections] = useState<Record<string, ConnectionInfo>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/domains");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(res.status === 403 ? "Această secțiune e doar pentru superadmin." : data.error || "Nu am putut încărca domeniile.");
    } else {
      setDomains(data.domains ?? []);
      setLimit(data.limit ?? 5);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const res = await fetch("/api/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostname }) });
    const data = await res.json().catch(() => ({}));
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Nu am putut adăuga domeniul.");
      return;
    }
    setHostname("");
    setDomains((prev) => [...prev, data.domain]);
  }

  async function verify(domain: DomainRow) {
    setChecking(domain.id);
    setMessages((m) => ({ ...m, [domain.id]: "" }));
    const res = await fetch(`/api/domains/${domain.id}/verify`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setChecking(null);
    if (data.verified) {
      setDomains((prev) => prev.map((d) => (d.id === domain.id ? { ...d, status: data.status ?? "verified" } : d)));
    } else {
      setMessages((m) => ({ ...m, [domain.id]: data.message || data.error || "Nu am putut verifica domeniul." }));
    }
  }

  // Connected but not active yet: read the current state (and the DNS record to create) when the page opens
  useEffect(() => {
    domains
      .filter((d) => d.vercel_added && d.status === "verified" && !connections[d.id])
      .forEach((d) => {
        fetch(`/api/domains/${d.id}/status`, { method: "POST" })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) return;
            setConnections((c) => ({ ...c, [d.id]: { dns: data.dns ?? null, vercelChallenge: data.vercelChallenge ?? null } }));
            if (data.active) setDomains((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: "active" } : x)));
          })
          .catch(() => {});
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains]);

  async function connect(domain: DomainRow) {
    setBusy(domain.id);
    setMessages((m) => ({ ...m, [domain.id]: "" }));
    const res = await fetch(`/api/domains/${domain.id}/connect`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessages((m) => ({ ...m, [domain.id]: data.error || "Nu am putut conecta domeniul." }));
      return;
    }
    setDomains((prev) => prev.map((d) => (d.id === domain.id ? { ...d, vercel_added: true } : d)));
    setConnections((c) => ({ ...c, [domain.id]: { dns: data.dns ?? null, vercelChallenge: data.vercelChallenge ?? null } }));
  }

  async function checkConnection(domain: DomainRow) {
    setBusy(domain.id);
    setMessages((m) => ({ ...m, [domain.id]: "" }));
    const res = await fetch(`/api/domains/${domain.id}/status`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessages((m) => ({ ...m, [domain.id]: data.error || "Nu am putut verifica conexiunea." }));
      return;
    }
    setConnections((c) => ({ ...c, [domain.id]: { dns: data.dns ?? null, vercelChallenge: data.vercelChallenge ?? null } }));
    if (data.active) setDomains((prev) => prev.map((d) => (d.id === domain.id ? { ...d, status: "active" } : d)));
    else setMessages((m) => ({ ...m, [domain.id]: "Încă nu e gata: DNS-ul nu arată spre server sau certificatul SSL nu s-a emis. Poate dura de la câteva minute la câteva ore." }));
  }

  async function remove(domain: DomainRow) {
    if (!window.confirm(`Ștergi domeniul ${domain.hostname}? Nu se poate anula.`)) return;
    const res = await fetch(`/api/domains/${domain.id}`, { method: "DELETE" });
    if (res.ok) setDomains((prev) => prev.filter((d) => d.id !== domain.id));
    else setError("Nu am putut șterge domeniul.");
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/pages" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Pagini proprii
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-white">Domenii</h1>
        <p className="mt-2 text-zinc-400">
          Paginile proprii se vor afișa pe domeniile tale, de exemplu <code>comanda.firma.ro/pagina</code>. Mai întâi dovedești că domeniul e al tău, cu un record TXT în DNS. Poți adăuga cel mult {limit} domenii.
        </p>
      </div>

      {error && <div className="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>}

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-200">Domeniu sau subdomeniu</label>
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="comanda.firma.ro"
            required
            className="w-72 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
          />
        </div>
        <button type="submit" disabled={adding || domains.length >= limit} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {adding ? "Se adaugă…" : "Adaugă domeniu"}
        </button>
        <p className="basis-full text-xs text-zinc-400">
          Dacă domeniul are deja un site, folosește un subdomeniu (comanda.firma.ro), ca site-ul existent să nu fie afectat. Pentru un domeniu nou poți folosi direct domeniul.
        </p>
      </form>

      {loading ? (
        <p className="text-zinc-400">Se încarcă…</p>
      ) : domains.length === 0 ? (
        <p className="rounded-lg border border-zinc-700 bg-zinc-800 p-6 text-center text-zinc-400">Nu ai încă niciun domeniu.</p>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <div key={domain.id} className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-semibold text-white">{domain.hostname}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[domain.status]}`}>{STATUS_LABEL[domain.status]}</span>
                <button type="button" onClick={() => remove(domain)} className="ml-auto text-sm text-red-400 hover:text-red-300">
                  Șterge
                </button>
              </div>

              {domain.status === "pending" ? (
                <>
                  <p className="text-sm text-zinc-300">
                    Pasul 1: la furnizorul DNS al domeniului (unde l-ai cumpărat sau unde îi gestionezi DNS-ul), creează un record <strong>TXT</strong> cu valorile de mai jos. Apoi apasă „Verifică”. DNS-ul se poate actualiza în câteva minute sau, rar, în câteva ore.
                  </p>
                  <CopyValue label="Nume (host) record TXT" value={domain.record.name} />
                  <CopyValue label="Valoare" value={domain.record.value} />
                  <p className="text-xs text-zinc-400">
                    Unii furnizori adaugă singuri domeniul principal la finalul numelui. În acest caz scrie numele fără el, de exemplu <code>_velaro-verify.comanda</code> pentru <code>comanda.firma.ro</code>.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => verify(domain)} disabled={checking === domain.id} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                      {checking === domain.id ? "Se verifică…" : "Verifică"}
                    </button>
                    {messages[domain.id] && <span className="text-sm text-amber-300">{messages[domain.id]}</span>}
                  </div>
                </>
              ) : domain.status === "active" ? (
                <div className="space-y-3">
                  <p className="text-sm text-emerald-300">Domeniul este conectat și activ: DNS-ul arată spre server, iar certificatul SSL e emis.</p>
                  <button type="button" onClick={() => checkConnection(domain)} disabled={busy === domain.id} className="text-xs text-zinc-400 underline hover:text-zinc-200 disabled:opacity-50">
                    {busy === domain.id ? "Se verifică…" : "Reverifică conexiunea"}
                  </button>
                </div>
              ) : !domain.vercel_added ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-300">Domeniul e verificat: ai dovedit că e al tău. Pasul 2: conectează-l la serverul care afișează paginile.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => connect(domain)} disabled={busy === domain.id} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                      {busy === domain.id ? "Se conectează…" : "Conectează la server"}
                    </button>
                    {messages[domain.id] && <span className="text-sm text-amber-300">{messages[domain.id]}</span>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-300">Domeniul e adăugat la server. Pasul 3: DNS-ul trebuie să arate spre server, cu recordul de mai jos.</p>
                  {connections[domain.id]?.dns ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <CopyValue label="Tip" value={connections[domain.id].dns!.type} />
                        <CopyValue label="Nume (host)" value={connections[domain.id].dns!.name} />
                        <CopyValue label="Valoare" value={connections[domain.id].dns!.value} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">Se încarcă recordul DNS recomandat…</p>
                  )}
                  {connections[domain.id]?.vercelChallenge && (
                    <div className="space-y-2 rounded-md border border-zinc-600 p-3">
                      <p className="text-xs text-zinc-300">Serverul cere și o verificare suplimentară (domeniul a mai fost folosit în alt cont). Creează acest record, apoi apasă „Verifică conexiunea”:</p>
                      <CopyValue label={`Tip ${connections[domain.id].vercelChallenge!.type} · nume`} value={connections[domain.id].vercelChallenge!.domain} />
                      <CopyValue label="Valoare" value={connections[domain.id].vercelChallenge!.value} />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => checkConnection(domain)} disabled={busy === domain.id} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                      {busy === domain.id ? "Se verifică…" : "Verifică conexiunea"}
                    </button>
                    {messages[domain.id] && <span className="text-sm text-amber-300">{messages[domain.id]}</span>}
                  </div>
                </div>
              )}
              {domain.status !== "pending" && (
                <RootRedirect
                  key={`${domain.id}-${domain.root_redirect ?? ""}`}
                  domain={domain}
                  onSaved={(value) => setDomains((prev) => prev.map((d) => (d.id === domain.id ? { ...d, root_redirect: value } : d)))}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
