"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { bucharestDateKey, shiftDateKey } from "@/lib/romania-time";

interface Counts {
  visits: number;
  formSeen: number;
  started: number;
  ordered: number;
}
type Row = Counts & { key: string };
interface Stats {
  total: Counts;
  byPage: Row[];
  byDay: Row[];
  bySource: Row[];
  byCampaign: Row[];
  byDevice: Row[];
  byHour: (Counts & { hour: number })[];
  errors: { message: string; count: number; browsers: string[] }[];
  speed: { fcpMedianMs: number | null; formMedianMs: number | null; timeMedianS: number | null; scrollMedian: number | null; visitsWithErrors: number };
  truncated: boolean;
}

const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1).replace(".0", "")}%` : "–");
const seconds = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(1)} s`);

function Funnel({ counts }: { counts: Counts }) {
  const steps = [
    { label: "Vizitatori", value: counts.visits, color: "bg-sky-500" },
    { label: "Au văzut formularul", value: counts.formSeen, color: "bg-indigo-500" },
    { label: "Au început formularul", value: counts.started, color: "bg-violet-500" },
    { label: "Au trimis comanda", value: counts.ordered, color: "bg-emerald-500" },
  ];
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-zinc-200">{step.label}</span>
            <span className="text-zinc-300">
              <strong className="text-white">{step.value}</strong>
              <span className="ml-2 text-zinc-400">
                {pct(step.value, counts.visits)}
                {i > 0 && ` din vizitatori · ${pct(step.value, steps[i - 1].value)} din pasul de dinainte`}
              </span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-zinc-700">
            <div className={`h-full ${step.color}`} style={{ width: `${counts.visits > 0 ? Math.max(1, (step.value / counts.visits) * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Table({ title, rows, firstColumn }: { title: string; rows: Row[]; firstColumn: string }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Nicio vizită în perioada aleasă.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="py-2 pr-3 font-medium">{firstColumn}</th>
                <th className="px-2 py-2 text-right font-medium">Vizitatori</th>
                <th className="px-2 py-2 text-right font-medium">Au văzut formularul</th>
                <th className="px-2 py-2 text-right font-medium">Au început</th>
                <th className="px-2 py-2 text-right font-medium">Comenzi</th>
                <th className="pl-2 py-2 text-right font-medium">Conversie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-zinc-700/60 text-zinc-200">
                  <td className="py-2 pr-3">{row.key}</td>
                  <td className="px-2 py-2 text-right">{row.visits}</td>
                  <td className="px-2 py-2 text-right">{row.formSeen}</td>
                  <td className="px-2 py-2 text-right">{row.started}</td>
                  <td className="px-2 py-2 text-right font-medium text-white">{row.ordered}</td>
                  <td className="pl-2 py-2 text-right">{pct(row.ordered, row.visits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const PRESETS = [
  { id: "today", label: "Azi", days: 0 },
  { id: "yesterday", label: "Ieri", days: 1 },
  { id: "7", label: "Ultimele 7 zile", days: 6 },
  { id: "30", label: "Ultimele 30 de zile", days: 29 },
] as const;

const BAR_AREA = 104; // px available for the tallest bar

/** Visits per hour (blue) with the orders of that hour (green) inside the bar; the numbers are readable without hovering. */
function HoursChart({ hours }: { hours: (Counts & { hour: number })[] }) {
  const maxVisits = Math.max(1, ...hours.map((h) => h.visits));
  const busiest = hours.reduce((best, h) => (h.visits > best.visits ? h : best), hours[0] ?? { hour: 0, visits: 0, formSeen: 0, started: 0, ordered: 0 });
  const bestOrders = hours.reduce((best, h) => (h.ordered > best.ordered ? h : best), hours[0] ?? busiest);
  const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="text-lg font-semibold text-white">Vizite și comenzi pe ore (ora României)</h2>
      <div className="mb-3 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-300">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" /> Vizite</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Comenzi</span>
        {busiest.visits > 0 && <span className="text-zinc-400">Cea mai aglomerată oră: <strong className="text-white">{hourLabel(busiest.hour)}</strong> ({busiest.visits} vizite)</span>}
        {bestOrders.ordered > 0 && <span className="text-zinc-400">Cele mai multe comenzi: <strong className="text-emerald-400">{hourLabel(bestOrders.hour)}</strong> ({bestOrders.ordered})</span>}
      </div>
      <div className="flex items-end gap-0.5 sm:gap-1">
        {hours.map((h) => {
          const barHeight = h.visits > 0 ? Math.max(3, Math.round((h.visits / maxVisits) * BAR_AREA)) : 0;
          const orderHeight = h.ordered > 0 ? Math.max(3, Math.round((h.ordered / maxVisits) * BAR_AREA)) : 0;
          return (
            <div
              key={h.hour}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ height: BAR_AREA + 20 }}
              title={`${hourLabel(h.hour)} – ${h.visits} vizite, ${h.formSeen} au văzut formularul, ${h.started} au început formularul, ${h.ordered} comenzi`}
            >
              {h.visits > 0 && <span className="mb-0.5 text-[10px] font-medium leading-none text-sky-300">{h.visits}</span>}
              <div className="relative w-full overflow-hidden rounded-t bg-sky-500" style={{ height: barHeight }}>
                {orderHeight > 0 && <div className="absolute inset-x-0 bottom-0 bg-emerald-500" style={{ height: orderHeight }} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-0.5 sm:gap-1">
        {hours.map((h) => (
          <div key={h.hour} className="min-w-0 flex-1 text-center">
            <div className={`text-[9px] text-zinc-400 sm:text-[10px] ${h.hour % 3 === 0 ? "" : "max-sm:invisible"}`}>{h.hour}</div>
            <div className="h-3 text-[10px] font-semibold leading-3 text-emerald-400">{h.ordered > 0 ? h.ordered : ""}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-zinc-400">Cifra albastră de deasupra barei = vizite. Cifra verde de sub oră = comenzi.</p>
    </div>
  );
}

export default function PagesStatsPage() {
  const today = useMemo(() => bucharestDateKey(new Date()), []);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("7");
  const [slug, setSlug] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [pageOptions, setPageOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const p = PRESETS.find((x) => x.id === preset)!;
    if (preset === "yesterday") return { from: shiftDateKey(today, -1), to: shiftDateKey(today, -1) };
    return { from: shiftDateKey(today, -p.days), to: today };
  }, [preset, today]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from: range.from, to: range.to });
      if (slug) qs.set("slug", slug);
      const res = await fetch(`/api/pages-stats?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare");
      setStats(data);
      // The page list comes from the unfiltered view, so choosing one page does not empty the selector
      if (!slug) setPageOptions((data.byPage as Row[]).map((r) => r.key).sort());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setLoading(false);
    }
  }, [range, slug]);

  useEffect(() => {
    load();
  }, [load]);

  const hours = stats?.byHour ?? [];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/pages" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Pagini proprii
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-white">Statistici pagini proprii</h1>
        <p className="mt-2 text-zinc-400">
          Vizitele anonime de pe paginile publicate pe domeniile tale. Zilele și orele sunt în ora României. Nu se numără vizitele cu <code>?notrack=1</code>, roboții și previzualizările din editor.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-md border border-zinc-700 bg-zinc-800 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`rounded px-3 py-1.5 text-sm ${preset === p.id ? "bg-zinc-600 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white">
          <option value="">Toate paginile</option>
          {pageOptions.map((s) => (
            <option key={s} value={s}>
              /{s}
            </option>
          ))}
        </select>
        <button type="button" onClick={load} className="rounded-md border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          Reîncarcă
        </button>
      </div>

      {error && <div className="rounded-md border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>}
      {loading && !stats && <p className="text-zinc-400">Se încarcă…</p>}

      {stats && (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          {stats.truncated && <div className="rounded-md border border-amber-800 bg-amber-900/20 p-3 text-sm text-amber-200">Perioada are foarte multe vizite: sunt luate în calcul primele 50.000.</div>}

          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">Pâlnia de conversie</h2>
            <Funnel counts={stats.total} />
            <p className="mt-4 text-xs text-zinc-400">„Au început” = au atins un câmp al formularului. „Comenzi” = comenzi trimise din pagină, inclusiv cele de test (marchează-le cu <code>?notrack=1</code> ca să nu apară).</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Prima afișare (mediană)", value: seconds(stats.speed.fcpMedianMs) },
              { label: "Formular vizibil după (mediană)", value: seconds(stats.speed.formMedianMs) },
              { label: "Timp pe pagină (mediană)", value: stats.speed.timeMedianS === null ? "–" : `${stats.speed.timeMedianS} s` },
              { label: "Derulare (mediană)", value: stats.speed.scrollMedian === null ? "–" : `${stats.speed.scrollMedian}%` },
              { label: "Vizite cu erori JS", value: String(stats.speed.visitsWithErrors) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                <div className="text-xs text-zinc-400">{item.label}</div>
                <div className="mt-1 text-xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>

          {!slug && <Table title="Pe pagină" rows={stats.byPage} firstColumn="Pagină" />}
          <Table title="Pe zi" rows={stats.byDay} firstColumn="Zi" />
          <Table title="Pe sursă" rows={stats.bySource} firstColumn="Sursă" />
          <Table title="Pe campanie / reclamă" rows={stats.byCampaign} firstColumn="Sursă / campanie / reclamă" />
          <Table title="Pe dispozitiv" rows={stats.byDevice} firstColumn="Dispozitiv · sistem · browser" />

          {stats.errors.length > 0 && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <h2 className="mb-1 text-lg font-semibold text-white">Erori JavaScript</h2>
              <p className="mb-3 text-xs text-zinc-400">Prima eroare a fiecărei vizite. „Script error” fără detalii vine de obicei din browserul aplicațiilor (Facebook, Instagram) sau din extensii, nu din pagină.</p>
              <div className="space-y-2">
                {stats.errors.map((e) => (
                  <div key={e.message} className="rounded border border-zinc-700 bg-zinc-900 p-3 text-sm">
                    <div className="break-words font-mono text-xs text-zinc-200">{e.message}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {e.count} {e.count === 1 ? "vizită" : "vizite"} · {e.browsers.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <HoursChart hours={hours} />
        </div>
      )}
    </div>
  );
}
