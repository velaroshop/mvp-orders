"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface Result {
  from: string;
  to: string;
  placed: number;
  unconfirmed: number;
  delivered: number;
  returned: number;
  transit: number;
  deliveredRate: number;
  revenueNet: number;
  productCost: number;
  courier: number;
  ads: number;
  fixed: number;
  profit: number;
  estimate: { parcels: number; profit: number };
  missingCost: number;
  adsDays: number;
  days: number;
}

interface MonthRow {
  key: string;
  available: boolean;
  complete: boolean;
  result: Result | null;
}

interface DailyRow {
  day: string;
  placed: number;
  delivered: number;
  returned: number;
  transit: number;
  ads: number;
  profit: number;
}

interface Payload {
  cutoff: string | null;
  params: { vat: number; courierPack: number; courier: number; packaging: number; fixedMonthly: number; fixedColumn: boolean };
  meta: { lastInsightDate: string | null };
  months: MonthRow[];
  daily: DailyRow[];
}

const MONTH_NAMES = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

const money = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;
const signed = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("ro-RO")} lei`;
const monthLabel = (key: string) => `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const shortDate = (day: string) => `${Number(day.slice(8, 10))} ${MONTH_NAMES[Number(day.slice(5, 7)) - 1].slice(0, 3)}`;

function Line({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "border-t border-zinc-700 pt-3 mt-1" : ""}`}>
      <div>
        <span className={strong ? "text-sm font-semibold text-white" : "text-sm text-zinc-300"}>{label}</span>
        {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
      </div>
      <span className={strong ? "text-lg font-bold text-white" : "text-sm font-medium text-white"}>{value}</span>
    </div>
  );
}

export default function ProfitPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [fixedInput, setFixedInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isSuperadmin =
    (session?.user as any)?.activeRole === "owner" && (session?.user as any)?.isSuperadminOrg === true;

  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperadmin) router.replace("/admin/orders");
  }, [status, isSuperadmin, router]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/profit");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nu am putut încărca datele.");
      setData(json);
      setFixedInput(String(json.params.fixedMonthly || ""));
      setSelected((prev) => prev ?? json.months.find((m: MonthRow) => m.available)?.key ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSuperadmin) load();
  }, [isSuperadmin]);

  async function saveFixed() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/superadmin/profit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixedMonthly: Number(fixedInput || 0) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nu am putut salva.");
      setSaveMessage("Salvat.");
      await load();
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Eroare");
    } finally {
      setSaving(false);
    }
  }

  if (!isSuperadmin) return null;

  const month = data?.months.find((m) => m.key === selected && m.available) ?? null;
  const r = month?.result ?? null;
  const dailyOfMonth = month && data ? data.daily.filter((d) => d.day.startsWith(month.key)) : [];
  const maxAbs = Math.max(1, ...dailyOfMonth.map((d) => Math.abs(d.profit)));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Profit net</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pe luni, fără TVA, din comenzile plasate (inclusiv cele din parțiale). Se calculează doar până în ziua dinaintea celei mai
            recente zile cu un colet returnat, pentru că retururile ajung după câteva săptămâni.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reîncarcă
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>}

      {data && !data.params.fixedColumn && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
          Costurile fixe nu se pot salva încă: rulează migrarea 105 (settings.fixed_costs_monthly). Până atunci se calculează cu 0.
        </div>
      )}

      {data && (
        <>
          <div className="card p-4 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs text-zinc-400">Calculat până la</p>
              <p className="text-sm font-semibold text-white">{data.cutoff ? shortDate(data.cutoff) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Curier + ambalare / colet (fără TVA)</p>
              <p className="text-sm font-semibold text-white">{data.params.courierPack.toFixed(2)} lei</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">TVA</p>
              <p className="text-sm font-semibold text-white">{data.params.vat ? `${Math.round(data.params.vat * 100)}%` : "neplătitor"}</p>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Costuri fixe / lună (lei)</label>
                <input
                  type="number"
                  min="0"
                  value={fixedInput}
                  onChange={(e) => setFixedInput(e.target.value)}
                  className="w-32 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={saveFixed}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white disabled:opacity-50"
              >
                Salvează
              </button>
              {saveMessage && <span className="text-xs text-zinc-300 pb-2">{saveMessage}</span>}
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-400 border-b border-zinc-800">
                  <th className="px-4 py-2.5 font-medium">Luna</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium text-right">Comenzi</th>
                  <th className="px-4 py-2.5 font-medium text-right">Venit net</th>
                  <th className="px-4 py-2.5 font-medium text-right">Profit net</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr
                    key={m.key}
                    onClick={() => m.available && setSelected(m.key)}
                    className={`border-b border-zinc-800/60 ${m.available ? "cursor-pointer hover:bg-zinc-800/40" : "opacity-60"} ${selected === m.key ? "bg-zinc-800/60" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-white capitalize">{monthLabel(m.key)}</td>
                    <td className="px-4 py-2.5">
                      {!m.available ? (
                        <span className="text-xs text-zinc-400">încă fără date complete</span>
                      ) : m.complete ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">complet</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          incomplet · până la {shortDate(m.result!.to)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-300">{m.result ? m.result.placed : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-300">{m.result ? money(m.result.revenueNet) : "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${m.result ? (m.result.profit < 0 ? "text-red-400" : "text-emerald-400") : "text-zinc-400"}`}>
                      {m.result ? signed(m.result.profit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {r && month && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-4">
                <h2 className="text-sm font-semibold text-white mb-2">
                  <span className="capitalize">{monthLabel(month.key)}</span>
                  {!month.complete && <span className="text-zinc-400 font-normal"> · până la {shortDate(r.to)}</span>}
                </h2>
                <Line label="Comenzi plasate" value={String(r.placed)} hint={`${r.unconfirmed} neconfirmate sau anulate`} />
                <Line label="Colete livrate" value={String(r.delivered)} />
                <Line label="Colete returnate" value={String(r.returned)} hint={`${Math.round((1 - r.deliveredRate) * 1000) / 10}% din coletele finalizate`} />
                <Line label="Colete în livrare" value={String(r.transit)} hint="numărate cu rata livrate/returnate de mai sus" />
                <div className="h-2" />
                <Line label="Venit net (fără TVA)" value={money(r.revenueNet)} />
                <Line label="− Cost marfă" value={money(r.productCost)} />
                <Line label="− Curier + ambalare" value={money(r.courier)} hint="pe toate coletele expediate, inclusiv cele returnate (doar dus)" />
                <Line label="− Reclame Meta" value={money(r.ads)} />
                <Line label="− Costuri fixe" value={money(r.fixed)} />
                <Line label="Profit net" value={signed(r.profit)} strong />
                {r.estimate.parcels > 0 && (
                  <p className="text-xs text-zinc-400 mt-2">
                    Din care estimat: {signed(r.estimate.profit)}, din {r.estimate.parcels} colete încă în livrare.
                  </p>
                )}
                <div className="mt-3 space-y-1">
                  {r.adsDays < r.days && (
                    <p className="text-xs text-amber-400">Date Meta pentru {r.adsDays} din {r.days} zile: reclamele pot fi subestimate.</p>
                  )}
                  {r.missingCost > 0 && (
                    <p className="text-xs text-amber-400">
                      {r.missingCost} comenzi au un produs fără preț de achiziție: costul lor de marfă e numărat incomplet.
                    </p>
                  )}
                </div>
              </div>

              <div className="card p-4">
                <h2 className="text-sm font-semibold text-white mb-1">Profit pe zile</h2>
                <p className="text-xs text-zinc-400 mb-3">Fiecare zi include cota ei din costurile fixe.</p>
                <div className="flex items-stretch gap-[2px] h-48">
                  {dailyOfMonth.map((d) => {
                    const height = Math.max(2, (Math.abs(d.profit) / maxAbs) * 50);
                    return (
                      <div key={d.day} className="flex-1 flex flex-col justify-center group relative min-w-0" title={`${shortDate(d.day)}: ${signed(d.profit)} · ${d.placed} comenzi · reclame ${money(d.ads)}`}>
                        <div className="flex-1 flex items-end">
                          {d.profit >= 0 && <div className="w-full bg-emerald-500/80 rounded-t-sm" style={{ height: `${height * 2}%` }} />}
                        </div>
                        <div className="flex-1 flex items-start">
                          {d.profit < 0 && <div className="w-full bg-red-500/80 rounded-b-sm" style={{ height: `${height * 2}%` }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-zinc-400 mt-2">
                  <span>{dailyOfMonth[0] ? shortDate(dailyOfMonth[0].day) : ""}</span>
                  <span>{dailyOfMonth.length ? shortDate(dailyOfMonth[dailyOfMonth.length - 1].day) : ""}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && !data && <p className="text-sm text-zinc-400 py-8 text-center">Se încarcă...</p>}
    </div>
  );
}
