"use client";

import { useState } from "react";

export type AdVerdictCode = "scale" | "watch" | "stop" | "early" | "paused" | "nospend" | "noprice" | "cooldown";

export interface AdRow {
  key: string;
  name: string;
  campaign: string;
  campaignId: string | null;
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
  recent3: { spend: number; orders: number } | null;
  diagnosis: string | null;
}

export interface CampaignRow {
  key: string;
  name: string;
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
  recent3: { spend: number; orders: number } | null;
  budgetChange: { date: string; until: string; oldBudget: number | null; newBudget: number | null; pct: number | null; active: boolean } | null;
  adCount: number;
  idleAds: { count: number; spend: number };
}

type Scored = Pick<AdRow, "key" | "name" | "spend" | "cpa" | "cpaMax" | "scaleBelow" | "stopAbove">;

export type AdsPayload =
  | null
  | { connected: false; error: string }
  | {
      connected: true;
      error?: string;
      rows: AdRow[];
      campaigns: CampaignRow[];
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
  cooldown: { label: "Așteaptă", badge: "bg-sky-500/20 text-sky-300 border-sky-600/50", border: "border-l-sky-500", hint: "Buget schimbat de curând: nu mai schimba încă" },
  nospend: { label: "Fără cheltuială", badge: "bg-zinc-600/40 text-zinc-300 border-zinc-500/50", border: "border-l-zinc-500", hint: "Nu am găsit reclama la Meta" },
  noprice: { label: "Fără prag", badge: "bg-zinc-600/40 text-zinc-300 border-zinc-500/50", border: "border-l-zinc-500", hint: "Lipsește pragul de CPA" },
};

// Inside a campaign (CBO) the budget is shared by Meta, so an ad is judged by what it does to the campaign
const ROLE_LABELS: Partial<Record<AdVerdictCode, string>> = { scale: "Câștigătoare", watch: "Neutră", stop: "De scos" };

const FILTERS: { id: "all" | AdVerdictCode | "quiet"; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "scale", label: "Scalează" },
  { id: "watch", label: "Urmărește" },
  { id: "stop", label: "Oprește" },
  { id: "cooldown", label: "Așteaptă după schimbare" },
  { id: "quiet", label: "Prea puține date / pauză" },
];

function Recent3({ r, cpaMax }: { r: { spend: number; orders: number } | null; cpaMax: number | null }) {
  if (!r) return null;
  const cpa = r.orders > 0 ? r.spend / r.orders : null;
  const bad = cpaMax !== null && (cpa === null ? r.spend >= cpaMax : cpa > cpaMax);
  return (
    <span className={bad ? "text-red-400" : "text-zinc-400"}>
      Ultimele 3 zile: {lei(r.spend)} · {r.orders} {r.orders === 1 ? "comandă" : "comenzi"} · CPA {cpa === null ? "–" : lei(cpa)}
    </span>
  );
}

const QUIET: AdVerdictCode[] = ["early", "paused", "nospend", "noprice"];

function cpaColor(ad: Scored): string {
  if (ad.cpa === null || ad.scaleBelow === null || ad.stopAbove === null || ad.cpaMax === null) return "text-white";
  if (ad.cpa < ad.scaleBelow) return "text-emerald-400";
  if (ad.cpa <= ad.cpaMax) return "text-emerald-300";
  if (ad.cpa <= ad.stopAbove) return "text-amber-300";
  return "text-red-400";
}

function AdCard({ ad, role = false }: { ad: AdRow; role?: boolean }) {
  const v = VERDICTS[ad.verdict.code];
  const label = (role && ROLE_LABELS[ad.verdict.code]) || v.label;
  return (
    <div className={`rounded-lg border border-zinc-700 border-l-4 ${v.border} bg-zinc-800 p-3 sm:p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${v.badge}`}>{label}</span>
            <span className="break-words font-semibold text-white">{ad.name}</span>
          </div>
          <p className="mt-1 break-words text-xs text-zinc-400">
            {!role && <>{ad.campaign} · </>}
            {ad.adset && <>{ad.adset} · </>}pagina <span className="text-zinc-300">/{ad.slug}</span>
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
        <Recent3 r={ad.recent3} cpaMax={ad.cpaMax} />
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

function ActionColumn({ code, ads, what }: { code: "scale" | "watch" | "stop"; ads: Scored[]; what: string }) {
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
        <p className="mt-3 text-sm text-zinc-400">Nicio {what} în această categorie.</p>
      )}
    </div>
  );
}

const CAMPAIGN_LABELS: Partial<Record<AdVerdictCode, string>> = { scale: "Scalează campania", watch: "Urmărește", stop: "Oprește / scade bugetul", cooldown: "Așteaptă după schimbarea de buget" };

function CampaignCard({ campaign, ads }: { campaign: CampaignRow; ads: AdRow[] }) {
  const v = VERDICTS[campaign.verdict.code];
  const label = CAMPAIGN_LABELS[campaign.verdict.code] ?? v.label;
  const order: AdVerdictCode[] = ["stop", "scale", "cooldown", "watch", "early", "paused", "nospend", "noprice"];
  const sorted = [...ads].sort((a, b) => order.indexOf(a.verdict.code) - order.indexOf(b.verdict.code) || b.spend - a.spend);
  const toRemove = ads.filter((a) => a.verdict.code === "stop");
  const winners = ads.filter((a) => a.verdict.code === "scale");
  return (
    <div className={`rounded-lg border border-zinc-700 border-l-4 ${v.border} bg-zinc-800 p-3 sm:p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${v.badge}`}>{label}</span>
            <span className="break-words font-semibold text-white">{campaign.name}</span>
            {campaign.active === false && <span className="text-xs text-zinc-400">(pauză)</span>}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            pagina <span className="text-zinc-300">/{campaign.slug}</span>
            {campaign.product && <> · {campaign.product}</>} · {campaign.adCount} {campaign.adCount === 1 ? "reclamă" : "reclame"} cu cheltuială
          </p>
        </div>
        <div className="flex shrink-0 gap-4 text-right">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Cheltuit</div>
            <div className="font-semibold text-white">{campaign.spend > 0 ? lei(campaign.spend) : "–"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Comenzi</div>
            <div className="font-semibold text-white">{campaign.ordered}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">CPA</div>
            <div className={`font-semibold ${cpaColor(campaign)}`}>{campaign.cpa === null ? "–" : lei(campaign.cpa)}</div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-sm text-zinc-200">{campaign.verdict.reason}</p>
      {campaign.budgetChange && (
        <p className="mt-1 text-xs text-sky-300">
          Ultima schimbare de buget: {new Date(`${campaign.budgetChange.date}T12:00:00Z`).toLocaleDateString("ro-RO", { day: "numeric", month: "short", timeZone: "UTC" })}
          {campaign.budgetChange.oldBudget !== null && campaign.budgetChange.newBudget !== null && <> ({lei(campaign.budgetChange.oldBudget)} → {lei(campaign.budgetChange.newBudget)} pe zi{campaign.budgetChange.pct !== null && <>, {campaign.budgetChange.pct > 0 ? "+" : ""}{campaign.budgetChange.pct}%</>})</>}
          {campaign.budgetChange.active && <> · următoarea schimbare după {new Date(`${campaign.budgetChange.until}T12:00:00Z`).toLocaleDateString("ro-RO", { day: "numeric", month: "short", timeZone: "UTC" })}</>}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>
          {campaign.visits} vizite · {pct(campaign.formSeen, campaign.visits)} văd formularul · {pct(campaign.started, campaign.formSeen)} încep · {pct(campaign.ordered, campaign.visits)} comandă
        </span>
        {campaign.cpaMax !== null && <span>Cost maxim pe comandă (echilibru): {lei(campaign.cpaMax)}</span>}
        <Recent3 r={campaign.recent3} cpaMax={campaign.cpaMax} />
        {campaign.trend && campaign.trendPct !== null && (
          <span className={campaign.trend === "better" ? "text-emerald-400" : campaign.trend === "worse" ? "text-red-400" : "text-zinc-400"}>
            {campaign.trend === "better" ? "▲ mai bun" : campaign.trend === "worse" ? "▼ mai slab" : "≈ la fel"}: CPA {campaign.trendPct > 0 ? "+" : ""}
            {campaign.trendPct}% față de perioada dinainte
          </span>
        )}
      </div>

      {(toRemove.length > 0 || winners.length > 0 || campaign.idleAds.count > 0) && (
        <p className="mt-2 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300">
          <span className="font-semibold text-zinc-200">În campanie: </span>
          {winners.length > 0 && <>{winners.length} {winners.length === 1 ? "reclamă câștigătoare" : "reclame câștigătoare"}. </>}
          {toRemove.length > 0 && <>{toRemove.length} {toRemove.length === 1 ? "reclamă de scos" : "reclame de scos"} ({lei(toRemove.reduce((sum, a) => sum + a.spend, 0))} cheltuiți). </>}
          {campaign.idleAds.count > 0 && <>{campaign.idleAds.count} {campaign.idleAds.count === 1 ? "reclamă" : "reclame"} au cheltuit {lei(campaign.idleAds.spend)} fără vizite pe paginile tale.</>}
        </p>
      )}

      {sorted.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-zinc-200">Reclamele din campanie ({sorted.length})</summary>
          <div className="mt-2 space-y-2">
            {sorted.map((ad) => (
              <AdCard key={ad.key} ad={ad} role />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function AdsSection({ ads, slugFiltered }: { ads: AdsPayload; slugFiltered: boolean }) {
  const [view, setView] = useState<"campaigns" | "ads">("campaigns");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  if (slugFiltered) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300">
        Analiza reclamelor e pe toate paginile odată (cheltuiala unei reclame sau campanii nu se poate împărți pe pagini). Alege „Toate paginile” ca să o vezi.
      </div>
    );
  }
  if (!ads) return null;
  if (!ads.connected) {
    return <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 text-sm text-amber-200">{ads.error}</div>;
  }

  const inCampaigns = view === "campaigns";
  const items: (AdRow | CampaignRow)[] = inCampaigns ? ads.campaigns : ads.rows;
  const byCode = (codes: AdVerdictCode[]) => items.filter((r) => codes.includes(r.verdict.code));
  const visible = filter === "all" ? items : filter === "quiet" ? byCode(QUIET) : byCode([filter]);
  const order: AdVerdictCode[] = ["stop", "scale", "cooldown", "watch", "early", "paused", "nospend", "noprice"];
  const sorted = [...visible].sort((a, b) => order.indexOf(a.verdict.code) - order.indexOf(b.verdict.code) || b.spend - a.spend);
  const what = inCampaigns ? "campanie" : "reclamă";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white">Ce faci cu {inCampaigns ? "campaniile" : "reclamele"}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Cheltuiala vine de la Meta, comenzile din paginile tale. Costul pe comandă (CPA) e comparat cu pragul de echilibru al produsului din pagina Break-even (preț, cost produs, confirmări, retururi).
            {inCampaigns && " Bugetul se decide pe campanie; reclamele din ea arată ce o trage în sus și ce o strică."}
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-zinc-700 bg-zinc-800 p-1">
          {([["campaigns", "Campanii"], ["ads", "Reclame"]] as const).map(([id, text]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setView(id); setFilter("all"); }}
              className={`rounded px-3 py-1.5 text-sm ${view === id ? "bg-zinc-600 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {ads.error && <div className="rounded-md border border-amber-800 bg-amber-900/20 p-3 text-sm text-amber-200">{ads.error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <ActionColumn code="scale" ads={byCode(["scale"])} what={what} />
        <ActionColumn code="watch" ads={byCode(["watch"])} what={what} />
        <ActionColumn code="stop" ads={byCode(["stop"])} what={what} />
      </div>

      <details className="rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-300">
        <summary className="cursor-pointer font-medium text-zinc-200">Cum se decide verdictul</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-300">
          <li><strong className="text-emerald-300">Scalează</strong>: CPA din perioada aleasă sub 70% din costul maxim pe comandă, cu cel puțin 10 comenzi pe campanie (5 pe o reclamă singură), <strong>și</strong> ultimele 3 zile sub costul maxim (nu scalezi o campanie care tocmai s-a stricat).</li>
          <li><strong className="text-red-300">Oprește</strong>: a cheltuit cel puțin de 2 ori costul maxim și are zero comenzi sau CPA peste 150% din el, fie în toată perioada, fie (doar la campanii) în ultimele 3 zile.</li>
          <li><strong className="text-sky-300">Așteaptă</strong>: ai schimbat bugetul campaniei de curând (detectat automat din jurnalul Meta). Nu o mai propun pentru scalare timp de 3 zile, ziua schimbării numărând ca prima.</li>
          <li><strong className="text-amber-200">Urmărește</strong>: tot ce e între; nu e încă nici de scalat, nici de oprit.</li>
          <li><strong>Prea devreme</strong>: sub 50 de vizite și sub costul maxim cheltuit; nu o judecăm.</li>
          <li>Verificarea pe ultimele 3 zile se face automat când perioada aleasă e mai lungă de 3 zile. Pe „3 zile”, „Ieri” sau „Azi” perioada însăși e verificarea.</li>
          <li>Trendul compară CPA-ul cu perioada de aceeași lungime dinainte. În vederea pe reclame, diagnosticul compară pașii reclamei (formular văzut, început, trimis) cu media paginii.</li>
        </ul>
      </details>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? items.length : f.id === "quiet" ? byCode(QUIET).length : byCode([f.id]).length;
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
        <p className="text-sm text-zinc-400">Nicio {what} în această categorie, în perioada aleasă.</p>
      ) : (
        <div className="space-y-2">
          {inCampaigns
            ? (sorted as CampaignRow[]).map((c) => <CampaignCard key={c.key} campaign={c} ads={ads.rows.filter((r) => r.campaignId === c.key)} />)
            : (sorted as AdRow[]).map((ad) => <AdCard key={ad.key} ad={ad} />)}
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
