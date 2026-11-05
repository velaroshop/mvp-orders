"use client";

import { Fragment, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

type VerdictCode = "stop" | "scale" | "hold" | "insufficient" | "nocost" | "nohistory" | "inactive";

interface Window {
  spend: number;
  orders: number;
  cpa: number | null;
}

interface Row {
  product: string;
  verdict: { code: VerdictCode; reason: string };
  cpaMax: number | null;
  stopAbove: number | null;
  scaleBelow: number | null;
  lowSample: boolean;
  w3: Window;
  w7: Window;
  detail: {
    matureOrders: number;
    offerMix: Record<string, number>;
    avgQty: number;
    upsellShare: number;
    aov: number;
    net: number;
    confirmed: number;
    confRate: number;
    delivered: number;
    returned: number;
    unresolved: number;
    retRate: number;
    unitCost: number | null;
    productCost: number | null;
    costDelivered: number | null;
    profitDelivered: number | null;
    returnLoss: number;
  };
}

interface Payload {
  periods: { start3: string; start7: string; lastDay: string; matureFrom: string; matureTo: string };
  params: { vat: number; courierPack: number; returnBack: number; upsellCost: number; stopMult: number; scaleMult: number };
  meta: { lastInsightDate: string | null; fetchedAt: string | null };
  rows: Row[];
  unmappedCampaigns: { name: string; spend7: number; reason: "unmapped" | "ambiguous" }[];
}

const VERDICTS: Record<VerdictCode, { label: string; className: string }> = {
  stop: { label: "Oprește", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  scale: { label: "Scalează", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  hold: { label: "Menține", className: "bg-zinc-700/40 text-zinc-300 border-zinc-600" },
  insufficient: { label: "Prea puține date", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  nocost: { label: "Lipsește cost", className: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
  nohistory: { label: "Fără istoric", className: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
  inactive: { label: "Inactiv", className: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
};

const f1 = (x: number | null | undefined) => (x == null ? "—" : x.toFixed(1).replace(".", ","));
const f2 = (x: number | null | undefined) => (x == null ? "—" : x.toFixed(2).replace(".", ","));
const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function cpaCell(w: Window, row: Row) {
  if (w.cpa == null) return <span className="text-zinc-400">{w.spend > 0 ? `${f1(w.spend)} / 0` : "—"}</span>;
  let color = "text-zinc-200";
  if (row.stopAbove != null && w.cpa > row.stopAbove) color = "text-red-400";
  else if (row.scaleBelow != null && w.cpa < row.scaleBelow) color = "text-emerald-400";
  return (
    <span className={`font-semibold ${color}`}>
      {f1(w.cpa)} <span className="text-zinc-400 font-normal text-xs">({w.orders})</span>
    </span>
  );
}

export default function BreakEvenPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

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
      const res = await fetch("/api/superadmin/break-even");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eroare la încărcare");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "loading" || !isSuperadmin) return;
    load();
  }, [status, isSuperadmin]);

  if (status === "loading" || !isSuperadmin) return null;

  const metaStale =
    data?.meta.lastInsightDate != null && data.meta.lastInsightDate < data.periods.lastDay;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">CPA Break-even</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Când scalezi sau oprești, pe produs. CPA real = cheltuiala campaniilor produsului / comenzile plasate ale produsului,
            pe zile încheiate (fără azi).
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

      {data && metaStale && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
          Datele Meta ajung doar până la {fmtDate(data.meta.lastInsightDate!)}. Apasă „Actualizează” în Dashboard Ads
          pentru ultimele zile, altfel cheltuiala e incompletă și CPA-ul iese prea mic.
        </div>
      )}
      {data && data.meta.lastInsightDate == null && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
          Nu există date Meta pentru ultimele 7 zile. Actualizează din Dashboard Ads.
        </div>
      )}

      {data && data.unmappedCampaigns.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
          <p className="font-medium">Campanii care nu au fost asociate unui produs (cheltuiala lor nu e în tabel):</p>
          <ul className="mt-1 space-y-0.5">
            {data.unmappedCampaigns.map((c) => (
              <li key={c.name}>
                {c.name} — {f1(c.spend7)} lei în 7 zile
                {c.reason === "ambiguous" && " (potrivită cu mai multe produse)"}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-amber-400/90">Numele campaniei trebuie să conțină numele produsului.</p>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-800">
              <th className="p-3 font-semibold">Produs</th>
              <th className="p-3 font-semibold text-right">CPA 3z</th>
              <th className="p-3 font-semibold text-right">CPA 7z</th>
              <th className="p-3 font-semibold text-right">CPA maxim</th>
              <th className="p-3 font-semibold text-right">Oprește peste</th>
              <th className="p-3 font-semibold text-right">Scalează sub</th>
              <th className="p-3 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr><td colSpan={7} className="p-6 text-center text-zinc-400">Se încarcă…</td></tr>
            )}
            {data?.rows.map((row) => {
              const v = VERDICTS[row.verdict.code];
              const isOpen = open === row.product;
              return (
                <Fragment key={row.product}>
                  <tr
                    onClick={() => setOpen(isOpen ? null : row.product)}
                    className="border-b border-zinc-800/60 hover:bg-zinc-800/30 cursor-pointer"
                  >
                    <td className="p-3 text-white font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                        {row.product}
                      </span>
                    </td>
                    <td className="p-3 text-right">{cpaCell(row.w3, row)}</td>
                    <td className="p-3 text-right">{cpaCell(row.w7, row)}</td>
                    <td className="p-3 text-right text-zinc-200">
                      {f1(row.cpaMax)}
                      {row.lowSample && <span title="Sub 30 de comenzi mature: prag nesigur" className="ml-1 text-amber-400">⚠</span>}
                    </td>
                    <td className="p-3 text-right text-zinc-200">{f1(row.stopAbove)}</td>
                    <td className="p-3 text-right text-zinc-200">{f1(row.scaleBelow)}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${v.className}`}>{v.label}</span>
                      <p className="text-xs text-zinc-400 mt-0.5">{row.verdict.reason}</p>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
                      <td colSpan={7} className="p-4 text-xs text-zinc-300">
                        <DetailBlock row={row} data={data} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {data && data.rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-zinc-400">Nicio dată de afișat.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <p className="text-xs text-zinc-400">
          CPA 3z: {fmtDate(data.periods.start3)}–{fmtDate(data.periods.lastDay)}, CPA 7z: {fmtDate(data.periods.start7)}–{fmtDate(data.periods.lastDay)}
          (între paranteze: comenzi plasate). Pragurile vin din comenzile {fmtDate(data.periods.matureFrom)}–{fmtDate(data.periods.matureTo)},
          cu statusul de livrare final. Oprește = 1,5× CPA maxim, scalează = 0,7×.
        </p>
      )}
    </div>
  );
}

function DetailBlock({ row, data }: { row: Row; data: Payload }) {
  const d = row.detail;
  const p = data.params;
  if (d.matureOrders === 0) return <p>Nicio comandă matură pentru acest produs.</p>;
  return (
    <div className="space-y-1">
      <p>
        <span className="text-zinc-400">Comenzi mature:</span> {d.matureOrders} · mix:{" "}
        {Object.entries(d.offerMix).map(([k, v]) => `${k.replace("offer_", "oferta ")}=${v}`).join(", ")} · {f2(d.avgQty)} buc/comandă ·{" "}
        {pct(d.upsellShare)} cu upsell
      </p>
      <p><span className="text-zinc-400">AOV:</span> {f2(d.aov)} lei → venit net {f2(d.net)} lei{p.vat > 0 ? ` (fără TVA ${Math.round(p.vat * 100)}%)` : ""}</p>
      <p><span className="text-zinc-400">Confirmare:</span> {d.confirmed} / {d.matureOrders} = {pct(d.confRate)}</p>
      <p>
        <span className="text-zinc-400">Retur:</span> {d.returned} refuzate / ({d.delivered} livrate + {d.returned} refuzate) = {pct(d.retRate)}
        {d.unresolved > 0 && ` · ${d.unresolved} încă nerezolvate`}
      </p>
      <p>
        <span className="text-zinc-400">Cost / comandă livrată:</span> {f2(d.productCost)} produs ({f2(d.unitCost)} × {f2(d.avgQty)}) + {f2(p.courierPack)} curier și ambalare + {f2(p.upsellCost * d.upsellShare)} upsell = {f2(d.costDelivered)} lei
      </p>
      <p><span className="text-zinc-400">Profit / comandă livrată:</span> {f2(d.profitDelivered)} lei · pierdere pe retur {f2(d.returnLoss)} lei (curierul de dus; returul nu costă, produsul se recuperează)</p>
      <p>
        <span className="text-zinc-400">CPA maxim</span> = {f2(d.profitDelivered)} × {pct(d.confRate)} × (1 − {pct(d.retRate)}) − {f2(d.returnLoss)} × {pct(d.confRate)} × {pct(d.retRate)} = <span className="text-white font-semibold">{f2(row.cpaMax)} lei</span>
      </p>
      <p><span className="text-zinc-400">Cheltuială:</span> 3z {f1(row.w3.spend)} lei / {row.w3.orders} comenzi · 7z {f1(row.w7.spend)} lei / {row.w7.orders} comenzi</p>
    </div>
  );
}
