"use client";

import { useState } from "react";

export type AdVerdictCode = "scale" | "watch" | "stop" | "early" | "paused" | "nospend" | "noprice";

export interface AdRow {
  key: string;
  name: string;
  campaign: string;
  adset: string;
  slug: string;
  product: string | null;
  active: boolean | null;
  spend: number;
  visits: number;
  formSeen: number;
  started: number;
  ordered: number;
  cpa: number | null;
  cpaMax: number | null;
  scaleBelow: number | null;
  stopAbove: number | null;
  verdict: { code: AdVerdictCode; reason: string };
  trend: "better" | "worse" | "same" | null;
  trendPct: number | null;
  diagnosis: string | null;
}

export type AdsPayload =
  | null
  | { connected: false; error: string }
  | {
      connected: true;
      error?: string;
      rows: AdRow[];
      otherSpend?: { total: number; count: number; top: { name: string; campaign: string; spend: number }[] };
    };

const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1).replace(".0", "")}%` : "–");

const VERDICTS: Record<AdVerdictCode, { label: string; badge: string; border: string; hint: string }> = {
  scale: { label: "Scalează", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-600/50", border: "border-l-emerald-500", hint: "Aduce comenzi mult sub costul maxim" },
  watch: { label: "Urmărește", badge: "bg-amber-500/20 text-amber-200 border-amber-600/50", border: "border-l-amber-500", hint: "Nu e nici de scalat, nici de oprit încă" },
  stop: { label: "Oprește", badge: "bg-red-500/20 text-red-300 border-red-600/50", border: "border-l-red-500", hint: "A cheltuit destul și iese peste pragul de oprire" },
  early: { label: "Prea devreme", badge: "bg-zinc-600/40 text-zinc-300 border-zinc-500/50", border: "border-l-zinc-500", hint: "Prea puține date pentru o decizie" },
  paused: { label: "Pauzată", badge: "bg-zinc-600/40 text-zinc-300 border-zinc-500/50", border: "border-l-zinc-500", hint: "Nu mai rulează" },
  nospend: { label: "Fără cheltuială", badge: "bg-zinc-600/40 text-zinc-300 border-zinc-500/50", border: "border-l-zinc-500", hint: "Nu am găsit reclama la Meta" },
  noprice: { label: "Fără prag", badge: "bg-zinc-600/40 text-zinc-300 border-zinc-500/50", border: "border-l-zinc-500", hint: "Lipsește pragul de CPA" },
};

const FILTERS: { id: "all" | AdVerdictCode | "quiet"; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "scale", label: "Scalează" },
  { id: "watch", label: "Urmărește" },
  { id: "stop", label: "Oprește" },
  { id: "quiet", label: "Prea puține date / pauză" },
];

const QUIET: AdVerdictCode[] = ["early", "paused", "nospend", "noprice"];

function cpaColor(ad: AdRow): string {
  if (ad.cpa === null || ad.scaleBelow === null || ad.stopAbove === null || ad.cpaMax === null) return "text-white";
  if (ad.cpa < ad.scaleBelow) return "text-emerald-400";
  if (ad.cpa <= ad.cpaMax) return "text-emerald-300";
  if (ad.cpa <= ad.stopAbove) return "text-amber-300";
  return "text-red-400";
}

function AdCard({ ad }: { ad: AdRow }) {
  const v = VERDICTS[ad.verdict.code];
  return (
    <div className={`rounded-lg border border-zinc-700 border-l-4 ${v.border} bg-zinc-800 p-3 sm:p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${v.badge}`}>{v.label}</span>
            <span className="break-words font-semibold text-white">{ad.name}</span>
          </div>
          <p className="mt-1 break-words text-xs text-zinc-400">
            {ad.campaign}
            {ad.adset && ` · ${ad.adset}`} · pagina <span className="text-zinc-300">/{ad.slug}</span>
            {ad.product && <> · {ad.product}</>}
          </p>
        </div>
        <div className="flex shrink-0 gap-4 text-right">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Cheltuit</div>
            <div className="font-semibold text-white">{ad.spend > 0 ? lei(ad.spend) : "–"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Comenzi</div>
            <div className="font-semibold text-white">{ad.ordered}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">CPA</div>
            <div className={`font-semibold ${cpaColor(ad)}`}>{ad.cpa === null ? "–" : lei(ad.cpa)}</div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-sm text-zinc-200">{ad.verdict.reason}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>
          {ad.visits} vizite · {pct(ad.formSeen, ad.visits)} văd formularul · {pct(ad.started, ad.formSeen)} încep · {pct(ad.ordered, ad.visits)} comandă
        </span>
        {ad.cpaMax !== null && <span>Cost maxim pe comandă (echilibru): {lei(ad.cpaMax)}</span>}
        {ad.trend && ad.trendPct !== null && (
          <span className={ad.trend === "better" ? "text-emerald-400" : ad.trend === "worse" ? "text-red-400" : "text-zinc-400"}>
            {ad.trend === "better" ? "▲ mai bun" : ad.trend === "worse" ? "▼ mai slab" : "≈ la fel"}: CPA {ad.trendPct > 0 ? "+" : ""}
            {ad.trendPct}% față de perioada dinainte
          </span>
        )}
      </div>

      {ad.diagnosis && (
        <p className="mt-2 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300">
          <span className="font-semibold text-zinc-200">Diagnostic: </span>
          {ad.diagnosis}
        </p>
      )}
    </div>
  );
}

function ActionColumn({ code, ads }: { code: "scale" | "watch" | "stop"; ads: AdRow[] }) {
  const v = VERDICTS[code];
  const spend = ads.reduce((sum, a) => sum + a.spend, 0);
  const top = [...ads].sort((a, b) => b.spend - a.spend).slice(0, 4);
  return (
    <div className={`rounded-lg border border-zinc-700 border-t-4 bg-zinc-800 p-4 ${v.border.replace("border-l-", "border-t-")}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-white">{v.label}</h3>
        <span className="text-2xl font-bold text-white">{ads.length}</span>
      </div>
      <p className="text-xs text-zinc-400">
        {v.hint}
        {ads.length > 0 && <> · {lei(spend)} cheltuiți</>}
      </p>
      {top.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {top.map((a) => (
            <li key={a.key} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-zinc-200" title={a.name}>{a.name}</span>
              <span className={`shrink-0 text-xs font-semibold ${cpaColor(a)}`}>{a.cpa === null ? "fără comenzi" : `CPA ${lei(a.cpa)}`}</span>
            </li>
          ))}
          {ads.length > top.length && <li className="text-xs text-zinc-400">+ încă {ads.length - top.length} mai jos</li>}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">Nicio reclamă în această categorie.</p>
      )}
    </div>
  );
}

export default function AdsSection({ ads, slugFiltered }: { ads: AdsPayload; slugFiltered: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  if (slugFiltered) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300">
        Analiza reclamelor e pe toate paginile odată (cheltuiala unei reclame nu se poate împărți pe pagini). Alege „Toate paginile” ca să o vezi.
      </div>
    );
  }
  if (!ads) return null;
  if (!ads.connected) {
    return <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 text-sm text-amber-200">{ads.error}</div>;
  }

  const byCode = (codes: AdVerdictCode[]) => ads.rows.filter((r) => codes.includes(r.verdict.code));
  const visible =
    filter === "all" ? ads.rows : filter === "quiet" ? byCode(QUIET) : byCode([filter]);
  const order: AdVerdictCode[] = ["stop", "scale", "watch", "early", "paused", "nospend", "noprice"];
  const sorted = [...visible].sort((a, b) => order.indexOf(a.verdict.code) - order.indexOf(b.verdict.code) || b.spend - a.spend);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">Ce faci cu reclamele</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Cheltuiala vine de la Meta, comenzile din paginile tale. Costul pe comandă (CPA) e comparat cu pragul de echilibru al produsului din pagina Break-even (preț, cost produs, confirmări, retururi).
        </p>
      </div>

      {ads.error && <div className="rounded-md border border-amber-800 bg-amber-900/20 p-3 text-sm text-amber-200">{ads.error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <ActionColumn code="scale" ads={byCode(["scale"])} />
        <ActionColumn code="watch" ads={byCode(["watch"])} />
        <ActionColumn code="stop" ads={byCode(["stop"])} />
      </div>

      <details className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-300">
        <summary className="cursor-pointer font-medium text-zinc-200">Cum se decide verdictul</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-300">
          <li><strong className="text-emerald-300">Scalează</strong>: cel puțin 5 comenzi și CPA sub 70% din costul maxim pe comandă.</li>
          <li><strong className="text-red-300">Oprește</strong>: a cheltuit cel puțin de 2 ori costul maxim și are zero comenzi sau CPA peste 150% din el.</li>
          <li><strong className="text-amber-200">Urmărește</strong>: tot ce e între; reclama nu e încă nici de scalat, nici de oprit.</li>
          <li><strong>Prea devreme</strong>: sub 50 de vizite și sub costul maxim cheltuit; nu o judecăm.</li>
          <li>Trendul compară CPA-ul cu perioada de aceeași lungime dinainte. Diagnosticul compară pașii reclamei (formular văzut, început, trimis) cu media paginii.</li>
        </ul>
      </details>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? ads.rows.length : f.id === "quiet" ? byCode(QUIET).length : byCode([f.id]).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${filter === f.id ? "border-zinc-400 bg-zinc-600 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
            >
              {f.label} <span className="text-zinc-400">{count}</span>
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-400">Nicio reclamă în această categorie, în perioada aleasă.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((ad) => (
            <AdCard key={ad.key} ad={ad} />
          ))}
        </div>
      )}

      {ads.otherSpend && ads.otherSpend.total > 0 && (
        <p className="text-xs text-zinc-400">
          Alte {ads.otherSpend.count} reclame au cheltuit {lei(ads.otherSpend.total)} fără să aducă vizite pe paginile proprii (alte pagini sau magazine). Nu sunt judecate aici.
        </p>
      )}
    </div>
  );
}
