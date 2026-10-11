"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Info,
  Package,
  PenLine,
  Layers,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; sku: string; import_price?: number | null; }

interface LandingPage {
  id: string; name: string;
  offer_heading_1: string; offer_heading_2: string; offer_heading_3: string;
  quantity_offer_1: number; quantity_offer_2: number; quantity_offer_3: number;
  price_1: number;          price_2: number;          price_3: number;
  shipping_price: number;
  free_shipping_offer_1: boolean; free_shipping_offer_2: boolean; free_shipping_offer_3: boolean;
}

interface Offer {
  label: string;
  numeral: number | string;
  pretTotal: string;
  freeShipping: boolean;
}

interface CommonInputs {
  costProdus: string;
  costCurier: string;
  rataRetur: string;
  platitorTVA: boolean;
  roasTarget: string;
  cpaTarget: string;
  calcMode: "cpa" | "roas";
  shippingPrice: string;
}

interface OfferResult {
  label: string;
  numeral: number;
  revenueClient: number;
  revenueNet: number;
  costComanda: number;
  profitBrut: number;
  margineNeta: number;
  breakEvenRoas: number | null;
  profitLaTarget: number;
  cheltuialaReclame: number;
  valid: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TVA = 0.21;

function n(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isFinite(val) ? val : 0;
  const parsed = parseFloat(String(val).replace(",", "."));
  return isFinite(parsed) ? parsed : 0;
}

function fmt(val: number, decimals = 2): string {
  if (!isFinite(val)) return "—";
  return val.toFixed(decimals).replace(".", ",");
}

function calcOffer(offer: Offer, common: CommonInputs): OfferResult {
  const numeral      = Math.max(1, n(offer.numeral));
  const pretTotal    = n(offer.pretTotal);
  const costProdus   = n(common.costProdus);
  const costCurier   = n(common.costCurier);
  const retur        = Math.min(0.99, Math.max(0, n(common.rataRetur) / 100));
  const tva          = common.platitorTVA;
  const shippingPrice = n(common.shippingPrice);

  if (pretTotal <= 0 || costProdus <= 0 || costCurier <= 0) {
    return { label: offer.label, numeral, revenueClient: 0, revenueNet: 0,
      costComanda: 0, profitBrut: 0, margineNeta: 0, breakEvenRoas: null,
      profitLaTarget: 0, cheltuialaReclame: 0, valid: false };
  }

  const revenueClient = pretTotal + (offer.freeShipping ? 0 : shippingPrice);
  const revenueNet    = tva ? revenueClient / (1 + TVA) : revenueClient;
  const costComanda   = numeral * costProdus + costCurier;

  // returned products go back to stock → product cost only on fulfilled orders
  // courier paid on ALL orders sent
  const profitBrut = (1 - retur) * (revenueNet - numeral * costProdus) - costCurier;

  const revenueNetDelivered = revenueNet * (1 - retur);
  const margineNeta = revenueNetDelivered > 0 ? (profitBrut / revenueNetDelivered) * 100 : 0;

  // breakEvenRoas is always revenueClient/profitBrut (valid in both modes)
  const breakEvenRoas = profitBrut > 0 ? revenueClient / profitBrut : null;

  // cheltuialaReclame depends on mode
  const cheltuialaReclame = common.calcMode === "cpa"
    ? n(common.cpaTarget)
    : (n(common.roasTarget) > 0 ? revenueClient / n(common.roasTarget) : 0);

  const profitLaTarget = profitBrut - cheltuialaReclame;

  return { label: offer.label, numeral, revenueClient, revenueNet, costComanda,
    profitBrut, margineNeta, breakEvenRoas, profitLaTarget, cheltuialaReclame, valid: true };
}

// Color helpers — ROAS table
function roasColor(roas: number, be: number | null) {
  if (be === null) return "text-white/40";
  if (roas < be)        return "text-red-400";
  if (roas < be * 1.15) return "text-amber-400";
  return "text-emerald-400";
}
function roasBg(roas: number, be: number | null) {
  if (be === null) return "";
  if (roas < be)        return "bg-red-500/5";
  if (roas < be * 1.15) return "bg-amber-500/5";
  return "bg-emerald-500/5";
}

// Color helpers — CPA table (higher CPA → worse)
function cpaColor(cpa: number, pb: number) {
  if (cpa >= pb)        return "text-red-400";
  if (cpa >= pb * 0.85) return "text-amber-400";
  return "text-emerald-400";
}
function cpaBg(cpa: number, pb: number) {
  if (cpa >= pb)        return "bg-red-500/5";
  if (cpa >= pb * 0.85) return "bg-amber-500/5";
  return "bg-emerald-500/5";
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      position: "relative", display: "inline-flex", flexShrink: 0,
      width: 44, height: 24, borderRadius: 12,
      background: checked ? "#4f46e5" : "#2a2a3a",
      border: `1px solid ${checked ? "#6366f1" : "rgba(255,255,255,0.18)"}`,
      cursor: "pointer", transition: "background 0.2s, border-color 0.2s",
    }}>
      <span style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, suffix, hint, placeholder = "0" }: {
  label: string; value: string; onChange?: (v: string) => void;
  suffix?: string; hint?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input type="number" value={value} placeholder={placeholder} step="any"
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/28 transition-colors pr-10"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-white/30 leading-tight">{hint}</p>}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mix Oferte
// ─────────────────────────────────────────────────────────────────────────────

function MixOferte({ results, common }: { results: OfferResult[]; common: CommonInputs }) {
  const validResults = results.filter(r => r.valid);
  const [mix, setMix] = useState(["60", "30", "10"]);

  if (validResults.length < 2) return null;

  // Only consider valid offers; map mix percentages to valid indices
  const validMix = results.map((r, i) => r.valid ? mix[i] : "0");

  const total = results.reduce((s, r, i) => s + (r.valid ? n(mix[i]) : 0), 0);
  const isValid = Math.abs(total - 100) < 0.01;

  const aovMediu        = results.reduce((s, r, i) => s + (n(validMix[i]) / 100) * r.revenueClient, 0);
  const profitBrutMediu = results.reduce((s, r, i) => s + (n(validMix[i]) / 100) * r.profitBrut, 0);
  const roasBeReal     = isValid && aovMediu > 0 ? aovMediu / profitBrutMediu : 0;
  const cpaBeMax       = isValid ? profitBrutMediu : 0;

  let profitMediuLaTarget = 0;
  if (isValid) {
    if (common.calcMode === "cpa") {
      profitMediuLaTarget = profitBrutMediu - n(common.cpaTarget);
    } else {
      const rt = n(common.roasTarget);
      profitMediuLaTarget = profitBrutMediu - (rt > 0 ? aovMediu / rt : 0);
    }
  }

  const targetLabel = common.calcMode === "cpa"
    ? `CPA ${common.cpaTarget} lei`
    : `ROAS ${common.roasTarget}x`;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-white/2 border-b border-white/8">
        <Layers className="w-4 h-4 text-white/40" />
        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Mix Oferte</span>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {results.map((r, i) => (
            r.valid ? (
              <div key={i} className="space-y-1">
                <label className="block text-[10px] font-semibold text-white/35 uppercase tracking-wide">
                  Oferta {i + 1}
                </label>
                <div className="relative">
                  <input type="number" min={0} max={100} value={mix[i]} placeholder="0"
                    onChange={(e) => { const next = [...mix]; next[i] = e.target.value; setMix(next); }}
                    className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/28 pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">%</span>
                </div>
              </div>
            ) : null
          ))}
        </div>

        {!isValid && (
          <div className="flex items-center gap-2 text-xs text-amber-400 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Suma trebuie să fie 100% (acum: {fmt(total, 0)}%)</span>
          </div>
        )}

        {isValid && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/4 border border-white/8 p-3">
                <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">AOV mediu</p>
                <p className="font-bold text-base text-white/75">{fmt(aovMediu)} lei</p>
              </div>
              <div className="rounded-lg bg-white/4 border border-white/8 p-3">
                <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">Profit brut mediu</p>
                <p className="font-bold text-base text-white/75">{fmt(profitBrutMediu)} lei</p>
              </div>
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/8 p-3">
                <p className="text-[10px] text-indigo-300/60 uppercase tracking-wide mb-1">ROAS break-even real</p>
                <p className="font-bold text-xl text-indigo-300">{fmt(roasBeReal)}x</p>
              </div>
              <div className="rounded-lg bg-white/4 border border-white/8 p-3">
                <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">CPA break-even mediu</p>
                <p className="font-bold text-base text-white/75">{fmt(cpaBeMax)} lei</p>
              </div>
              <div className={`rounded-lg border p-3 col-span-2 sm:col-span-2 ${profitMediuLaTarget >= 0 ? "border-emerald-500/20 bg-emerald-500/8" : "border-red-500/20 bg-red-500/8"}`}>
                <p className={`text-[10px] uppercase tracking-wide mb-1 ${profitMediuLaTarget >= 0 ? "text-emerald-300/60" : "text-red-300/60"}`}>
                  Profit mediu @ {targetLabel}
                </p>
                <p className={`font-bold text-xl ${profitMediuLaTarget >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {profitMediuLaTarget >= 0 ? "+" : ""}{fmt(profitMediuLaTarget)} lei
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/30 leading-snug">
              <strong className="text-white/45">ROAS break-even real {fmt(roasBeReal)}x</strong> = pragul de comparat cu ROAS-ul din Ads Manager. Sub acest ROAS, mixul de oferte e neprofitabil.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OfferRow
// ─────────────────────────────────────────────────────────────────────────────

function OfferRow({ index, result, common, offer, onOfferChange, isManual }: {
  index: number; result: OfferResult; common: CommonInputs;
  offer: Offer; onOfferChange?: (f: keyof Offer, v: string | boolean | number) => void;
  isManual: boolean;
}) {
  const [open, setOpen] = useState(index === 0);
  const isCPA = common.calcMode === "cpa";
  const cpaTarget = n(common.cpaTarget);
  const roasTarget = common.roasTarget;

  const profitColor = !result.valid ? "text-white/30"
    : result.profitLaTarget > 0 ? "text-emerald-400"
    : result.profitLaTarget < 0 ? "text-red-400" : "text-amber-400";

  const breakColor = !result.valid ? "text-white/30"
    : result.breakEvenRoas === null ? "text-red-400"
    : result.breakEvenRoas > 5 ? "text-amber-400" : "text-emerald-400";

  // ROAS table rows
  const roasRows = useMemo(() => {
    if (isCPA) return [];
    const arr = [];
    for (let r = 1.0; r <= 8.0; r = parseFloat((r + 0.5).toFixed(1))) {
      const cheltuiala = result.valid ? result.revenueClient / r : 0;
      const profit     = result.valid ? result.profitBrut - cheltuiala : 0;
      const roi        = result.valid && cheltuiala > 0 ? (profit / cheltuiala) * 100 : 0;
      arr.push({ roas: r, cheltuiala, profit, roi });
    }
    return arr;
  }, [result, isCPA]);

  // CPA table rows: 10–60 step 5, plus target if not on step
  const cpaRows = useMemo(() => {
    if (!isCPA || !result.valid) return [];
    const steps = new Set<number>();
    for (let c = 10; c <= 60; c += 5) steps.add(c);
    if (cpaTarget > 0 && !steps.has(cpaTarget)) steps.add(cpaTarget);
    return Array.from(steps).sort((a, b) => a - b).map(cpa => ({
      cpa,
      profit: result.profitBrut - cpa,
      roas:   result.revenueClient > 0 ? result.revenueClient / cpa : 0,
      roi:    (result.profitBrut - cpa) / cpa * 100,
    }));
  }, [result, isCPA, cpaTarget]);

  const cpaFmt = (v: number) => v === Math.floor(v) ? fmt(v, 0) : fmt(v);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left"
      >
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest w-16 shrink-0">
          Oferta {index + 1}
        </span>
        <div className="flex-1 flex items-center gap-4 min-w-0 text-xs">
          {isManual ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input type="number" min={1} value={offer.numeral} placeholder="1"
                onChange={e => onOfferChange?.("numeral", parseInt(e.target.value) || 1)}
                className="w-12 bg-white/5 border border-white/12 rounded px-1.5 py-1 text-white text-xs focus:outline-none"
              />
              <span className="text-white/30">buc ×</span>
              <input type="number" value={offer.pretTotal} placeholder="preț"
                onChange={e => onOfferChange?.("pretTotal", e.target.value)}
                className="w-20 bg-white/5 border border-white/12 rounded px-1.5 py-1 text-white text-xs focus:outline-none"
              />
              <span className="text-white/30">lei</span>
              <label className="flex items-center gap-1 cursor-pointer ml-1">
                <input type="checkbox" checked={offer.freeShipping}
                  onChange={e => onOfferChange?.("freeShipping", e.target.checked)}
                  className="w-3 h-3 accent-indigo-500"
                />
                <span className={`text-[11px] ${offer.freeShipping ? "text-indigo-300" : "text-white/30"}`}>
                  Livrare gratuită
                </span>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-white/50">
              <span><span className="text-white/25">Buc:</span> <strong className="text-white/70">{n(offer.numeral)}</strong></span>
              <span><span className="text-white/25">Preț client:</span> <strong className="text-white/70">{fmt(n(offer.pretTotal))} lei</strong></span>
              {offer.freeShipping && <span className="text-indigo-400 text-[10px] font-semibold">Livrare gratuită</span>}
            </div>
          )}
        </div>
        {result.valid && (
          <div className="hidden sm:flex items-center gap-6 shrink-0">
            {isCPA ? (
              <>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">CPA break-even</p>
                  <p className={`text-sm font-bold ${result.profitBrut > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmt(result.profitBrut)} lei
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">Profit @ CPA {common.cpaTarget} lei</p>
                  <p className={`text-sm font-bold ${profitColor}`}>{fmt(result.profitLaTarget)} lei</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">Breakeven</p>
                  <p className={`text-sm font-bold ${breakColor}`}>
                    {result.breakEvenRoas !== null ? `${fmt(result.breakEvenRoas)}x` : "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">Profit @ {roasTarget}x</p>
                  <p className={`text-sm font-bold ${profitColor}`}>{fmt(result.profitLaTarget)} lei</p>
                </div>
              </>
            )}
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-white/25 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-white/8 px-5 py-4 space-y-4">
          {!result.valid ? (
            <div className="flex items-center gap-2 text-white/30 text-sm py-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>Completează costurile și prețul ofertei pentru a vedea calculele.</span>
            </div>
          ) : (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(isCPA ? [
                  { label: "CPA break-even",               value: `${fmt(result.profitBrut)} lei`,                                                color: result.profitBrut > 0 ? "text-emerald-400" : "text-red-400", big: true },
                  { label: `Profit @ CPA ${common.cpaTarget} lei`, value: `${fmt(result.profitLaTarget)} lei`,                                   color: profitColor, big: true },
                  { label: `ROAS @ CPA ${common.cpaTarget} lei`,   value: cpaTarget > 0 ? `${fmt(result.revenueClient / cpaTarget)}x` : "—",     color: "text-white/75" },
                  { label: "Profit brut / cmd",             value: `${fmt(result.profitBrut)} lei`,                                               color: result.profitBrut > 0 ? "text-white/75" : "text-red-400" },
                ] : [
                  { label: "Breakeven ROAS",                value: result.breakEvenRoas !== null ? `${fmt(result.breakEvenRoas)}x` : "N/A",       color: breakColor, big: true },
                  { label: `Profit @ ${roasTarget}x ROAS`, value: `${fmt(result.profitLaTarget)} lei`,                                            color: profitColor, big: true },
                  { label: "Marjă netă",                    value: `${fmt(result.margineNeta)}%`,                                                 color: result.margineNeta > 0 ? "text-white/75" : "text-red-400" },
                  { label: "Profit brut / cmd",             value: `${fmt(result.profitBrut)} lei`,                                               color: result.profitBrut > 0 ? "text-white/75" : "text-red-400" },
                ]).map(m => (
                  <div key={m.label} className="rounded-lg bg-white/4 border border-white/8 p-3">
                    <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">{m.label}</p>
                    <p className={`font-bold ${m.big ? "text-xl" : "text-base"} ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Cost breakdown + table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Detaliu costuri */}
                <div className="space-y-1.5 text-xs rounded-lg bg-white/3 border border-white/8 p-3">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-2">Detaliu costuri</p>
                  <div className="flex justify-between text-white/50">
                    <span>Venit client (total)</span>
                    <span className="text-white/70 font-medium">{fmt(result.revenueClient)} lei</span>
                  </div>
                  {common.platitorTVA && (
                    <div className="flex justify-between text-white/50">
                      <span>Venit net (fără TVA 21%)</span>
                      <span className="text-white/70 font-medium">{fmt(result.revenueNet)} lei</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white/50 border-t border-white/6 pt-1.5 mt-1.5">
                    <span>Cost produs ({result.numeral} buc)</span>
                    <span className="text-white/70 font-medium">{fmt(result.numeral * n(common.costProdus))} lei</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Cost livrare</span>
                    <span className="text-white/70 font-medium">{fmt(n(common.costCurier))} lei</span>
                  </div>
                  <div className="flex justify-between text-white/50 text-[11px]">
                    <span>Rată retur aplicată</span>
                    <span>{common.rataRetur}%</span>
                  </div>
                  <div className="flex justify-between text-white/50 border-t border-white/6 pt-1.5 mt-1.5">
                    {isCPA ? (
                      <><span>CPA target</span><span className="text-white/60">{fmt(cpaTarget)} lei</span></>
                    ) : (
                      <><span>Reclame / cmd @ {roasTarget}x</span><span className="text-white/60">{fmt(result.cheltuialaReclame)} lei</span></>
                    )}
                  </div>
                </div>

                {/* CPA table */}
                {isCPA ? (
                  <div className="rounded-lg overflow-hidden border border-white/8">
                    <div className="grid grid-cols-4 px-3 py-2 text-[10px] font-semibold text-white/25 uppercase tracking-wide bg-white/3">
                      <span>CPA</span>
                      <span className="text-right">Profit</span>
                      <span className="text-right">ROAS</span>
                      <span className="text-right">ROI%</span>
                    </div>
                    {(() => {
                      const pc = (p: number) => p > 5 ? "text-emerald-400" : p >= 0 ? "text-amber-400" : "text-red-400";
                      const pb = (p: number) => p > 5 ? "bg-emerald-500/5"  : p >= 0 ? "bg-amber-500/5"  : "bg-red-500/5";
                      const sep = (
                        <div key="be-sep" className="px-3 py-0.5 border-y border-amber-500/40 bg-amber-500/5 text-center">
                          <span className="text-[10px] font-semibold text-amber-400 tracking-wide">
                            Break-even · {fmt(result.profitBrut)} lei
                          </span>
                        </div>
                      );
                      const out: React.ReactNode[] = [];
                      let sepInserted = false;
                      cpaRows.forEach((row, idx) => {
                        const { cpa, profit, roas, roi } = row;
                        const isTarget  = cpa === cpaTarget;
                        const isExactBE = Math.abs(profit) < 0.01;
                        // Insert separator between last profitable row and first loss row
                        if (!sepInserted && !isExactBE && profit < 0) {
                          const prev = cpaRows[idx - 1];
                          if (!prev || prev.profit >= 0) { sepInserted = true; out.push(sep); }
                        }
                        out.push(
                          <div key={cpa}
                            className={`grid grid-cols-4 px-3 py-1.5 text-xs border-t border-white/5 ${isExactBE ? "bg-amber-500/5" : pb(profit)} ${isTarget ? "ring-1 ring-inset ring-indigo-500/30" : ""}`}
                          >
                            <span className={`font-semibold ${isExactBE ? "text-amber-400" : pc(profit)}`}>
                              {cpaFmt(cpa)} lei
                              {isTarget && <span className="ml-1 text-[9px] text-indigo-400">▶</span>}
                            </span>
                            <span className={`text-right font-medium ${isExactBE ? "text-amber-400" : pc(profit)}`}>{profit >= 0 ? "+" : ""}{fmt(profit)}</span>
                            <span className={`text-right font-medium ${isExactBE ? "text-amber-400" : pc(profit)}`}>{fmt(roas)}x</span>
                            <span className={`text-right font-medium ${isExactBE ? "text-amber-400" : pc(profit)}`}>{roi >= 0 ? "+" : ""}{fmt(roi, 1)}%</span>
                          </div>
                        );
                      });
                      return out;
                    })()}
                  </div>
                ) : (
                  /* ROAS table */
                  <div className="rounded-lg overflow-hidden border border-white/8">
                    <div className="grid grid-cols-4 px-3 py-2 text-[10px] font-semibold text-white/25 uppercase tracking-wide bg-white/3">
                      <span>ROAS</span>
                      <span className="text-right">Reclame</span>
                      <span className="text-right">Profit</span>
                      <span className="text-right">ROI%</span>
                    </div>
                    {(() => {
                      const pc = (p: number) => p > 5 ? "text-emerald-400" : p >= 0 ? "text-amber-400" : "text-red-400";
                      const pb = (p: number) => p > 5 ? "bg-emerald-500/5"  : p >= 0 ? "bg-amber-500/5"  : "bg-red-500/5";
                      const sep = result.breakEvenRoas !== null ? (
                        <div key="be-sep" className="px-3 py-0.5 border-y border-amber-500/40 bg-amber-500/5 text-center">
                          <span className="text-[10px] font-semibold text-amber-400 tracking-wide">
                            Break-even · {fmt(result.breakEvenRoas)}x
                          </span>
                        </div>
                      ) : null;
                      const out: React.ReactNode[] = [];
                      let sepInserted = false;
                      roasRows.forEach((row, idx) => {
                        const { roas, cheltuiala, profit, roi } = row;
                        const isTarget  = fmt(roas, 1) === fmt(n(roasTarget), 1);
                        const isExactBE = Math.abs(profit) < 0.01;
                        // Insert separator between last loss row and first profitable row
                        if (!sepInserted && sep && !isExactBE && profit >= 0) {
                          const prev = roasRows[idx - 1];
                          if (!prev || prev.profit < 0) { sepInserted = true; out.push(sep); }
                        }
                        out.push(
                          <div key={roas}
                            className={`grid grid-cols-4 px-3 py-1.5 text-xs border-t border-white/5 ${isExactBE ? "bg-amber-500/5" : pb(profit)} ${isTarget ? "ring-1 ring-inset ring-indigo-500/30" : ""}`}
                          >
                            <span className={`font-semibold ${isExactBE ? "text-amber-400" : pc(profit)}`}>
                              {fmt(roas, 1)}x
                              {isTarget && <span className="ml-1 text-[9px] text-indigo-400">▶</span>}
                            </span>
                            <span className="text-right text-white/35">{fmt(cheltuiala)}</span>
                            <span className={`text-right font-medium ${isExactBE ? "text-amber-400" : pc(profit)}`}>{profit >= 0 ? "+" : ""}{fmt(profit)}</span>
                            <span className={`text-right font-medium ${isExactBE ? "text-amber-400" : pc(profit)}`}>{roi >= 0 ? "+" : ""}{fmt(roi, 1)}%</span>
                          </div>
                        );
                      });
                      return out;
                    })()}
                  </div>
                )}
              </div>

              {/* Warnings */}
              {(isCPA ? result.profitBrut <= 0 : result.breakEvenRoas === null) && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-2.5 text-sm text-red-300/80">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>Marja negativă — costurile depășesc venitul chiar și fără reclame.</span>
                </div>
              )}
              {!isCPA && result.breakEvenRoas !== null && result.breakEvenRoas > 4 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-4 py-2.5 text-sm text-amber-300/80">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>Breakeven ROAS de <strong className="text-amber-300">{fmt(result.breakEvenRoas)}x</strong> este ridicat.</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_COMMON: CommonInputs = {
  costProdus: "", costCurier: "", rataRetur: "15",
  platitorTVA: false, roasTarget: "3.5", cpaTarget: "24",
  calcMode: "cpa", shippingPrice: "0",
};

const DEFAULT_OFFERS: Offer[] = [
  { label: "Oferta 1", numeral: 1, pretTotal: "", freeShipping: false },
  { label: "Oferta 2", numeral: 2, pretTotal: "", freeShipping: false },
  { label: "Oferta 3", numeral: 3, pretTotal: "", freeShipping: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RoasCalculatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<"catalog" | "manual">("manual");
  const [common, setCommon] = useState<CommonInputs>(DEFAULT_COMMON);
  const [manualOffers, setManualOffers] = useState<Offer[]>(DEFAULT_OFFERS);

  const [products, setProducts]           = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [landingPages, setLandingPages]   = useState<LandingPage[]>([]);
  const [loadingLPs, setLoadingLPs]       = useState(false);
  const [selectedLPId, setSelectedLPId]   = useState("");
  const [catalogOffers, setCatalogOffers] = useState<Offer[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) router.replace("/admin/orders");
  }, [status, session, router]);

  useEffect(() => {
    if (mode !== "catalog") return;
    setLoadingProducts(true);
    fetch("/api/products/active")
      .then(r => r.json()).then(d => setProducts(d.products ?? []))
      .catch(() => setProducts([])).finally(() => setLoadingProducts(false));
  }, [mode]);

  useEffect(() => {
    if (!selectedProductId) { setLandingPages([]); setSelectedLPId(""); return; }
    // Pre-populate costProdus if the selected product has an import_price
    const product = products.find(p => p.id === selectedProductId);
    if (product?.import_price != null) {
      setCommon(prev => ({ ...prev, costProdus: String(product.import_price) }));
    }
    setLoadingLPs(true);
    fetch("/api/landing-pages?limit=100")
      .then(r => r.json())
      .then(d => {
        const filtered = (d.landingPages ?? []).filter((lp: any) => lp.product_id === selectedProductId);
        setLandingPages(filtered);
        setSelectedLPId(filtered.length > 0 ? filtered[0].id : "");
      })
      .catch(() => setLandingPages([])).finally(() => setLoadingLPs(false));
  }, [selectedProductId]);

  useEffect(() => {
    const lp = landingPages.find(l => l.id === selectedLPId);
    if (!lp) { setCatalogOffers([]); return; }
    setCatalogOffers([
      { label: "Oferta 1", numeral: n(lp.quantity_offer_1) || 1, pretTotal: String(n(lp.price_1)), freeShipping: !!lp.free_shipping_offer_1 },
      { label: "Oferta 2", numeral: n(lp.quantity_offer_2) || 1, pretTotal: String(n(lp.price_2)), freeShipping: !!lp.free_shipping_offer_2 },
      { label: "Oferta 3", numeral: n(lp.quantity_offer_3) || 1, pretTotal: String(n(lp.price_3)), freeShipping: !!lp.free_shipping_offer_3 },
    ]);
    setCommon(prev => ({ ...prev, shippingPrice: String(n(lp.shipping_price)) }));
  }, [selectedLPId, landingPages]);

  const setC = (key: keyof CommonInputs, val: string | boolean) =>
    setCommon(prev => ({ ...prev, [key]: val }));

  const updateOffer = (idx: number, field: keyof Offer, val: string | boolean | number) =>
    setManualOffers(prev => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));

  const activeOffers = mode === "catalog" ? catalogOffers : manualOffers;
  const results = useMemo(() => activeOffers.map(offer => calcOffer(offer, common)), [activeOffers, common]);

  if (status === "loading" || !session?.user) return null;

  const showOffers = mode === "manual" || catalogOffers.length > 0;

  return (
    <div className="min-h-screen bg-[#0f0f14] p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30">
            <Calculator className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Calculator Profitabilitate</h1>
            <p className="text-xs text-white/40 mt-0.5">Analiză per ofertă · mix oferte</p>
          </div>
          <span className="ml-auto px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wide">Beta</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 items-start">

          {/* LEFT: inputs */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5 space-y-4 xl:sticky xl:top-6">

            {/* TVA */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${!common.platitorTVA ? "text-white/65" : "text-white/25"}`}>Neplătitor TVA</span>
                <Toggle checked={common.platitorTVA} onChange={() => setC("platitorTVA", !common.platitorTVA)} />
                <span className={`text-sm font-medium ${common.platitorTVA ? "text-white/65" : "text-white/25"}`}>Plătitor TVA 21%</span>
              </div>
              {common.platitorTVA && (
                <div className="w-full rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-3 py-2 text-[11px] text-indigo-300/75 space-y-0.5">
                  <p><strong className="text-indigo-300">Prețuri de vânzare</strong> → cu TVA inclus (prețul clientului)</p>
                  <p><strong className="text-indigo-300">Cost produs & livrare</strong> → fără TVA (suma netă)</p>
                </div>
              )}
            </div>

            <Divider label="Sursă prețuri" />

            {/* Source mode */}
            <div className="flex rounded-lg overflow-hidden border border-white/12">
              {(["catalog", "manual"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${mode === m ? "bg-indigo-500/20 text-indigo-300" : "text-white/40 hover:text-white/65 hover:bg-white/5"}`}
                >
                  {m === "catalog" ? <Package className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                  {m === "catalog" ? "Din catalog" : "Manual"}
                </button>
              ))}
            </div>

            {/* Catalog selects */}
            {mode === "catalog" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-wide">Produs</label>
                  <div className="relative">
                    <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
                      className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 appearance-none pr-7"
                    >
                      <option value="" className="bg-[#1a1a24]">{loadingProducts ? "Se încarcă..." : "Selectează produs"}</option>
                      {products.map(p => <option key={p.id} value={p.id} className="bg-[#1a1a24]">{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  </div>
                </div>
                {selectedProductId && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-wide">Landing Page</label>
                    <div className="relative">
                      <select value={selectedLPId} onChange={e => setSelectedLPId(e.target.value)}
                        disabled={loadingLPs || landingPages.length === 0}
                        className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 appearance-none pr-7 disabled:opacity-40"
                      >
                        {loadingLPs && <option className="bg-[#1a1a24]">Se încarcă...</option>}
                        {!loadingLPs && landingPages.length === 0 && <option className="bg-[#1a1a24]">Nicio landing page</option>}
                        {landingPages.map(lp => <option key={lp.id} value={lp.id} className="bg-[#1a1a24]">{lp.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <Divider label="Costuri" />

            <Field label="Cost produs / bucată" value={common.costProdus}
              onChange={v => setC("costProdus", v)} suffix="lei"
              hint={common.platitorTVA ? "Fără TVA" : "Cu TVA inclus"}
            />
            <Field label="Cost livrare (curier + împachetare)" value={common.costCurier}
              onChange={v => setC("costCurier", v)} suffix="lei"
              hint={common.platitorTVA ? "Fără TVA (deductibil)" : "Cu TVA inclus"}
            />
            {mode === "manual" && (
              <Field label="Preț transport client" value={common.shippingPrice}
                onChange={v => setC("shippingPrice", v)} suffix="lei"
                hint="0 dacă livrare gratuită pe toate ofertele"
              />
            )}

            <Divider label="Parametri" />

            <Field label="Rată retur" value={common.rataRetur}
              onChange={v => setC("rataRetur", v)} suffix="%" />

            <Divider label="Mod calcul" />

            <div className="flex rounded-lg overflow-hidden border border-white/12">
              {(["cpa", "roas"] as const).map(m => (
                <button key={m} onClick={() => setC("calcMode", m)}
                  className={`flex-1 py-2 text-xs font-bold transition-colors uppercase tracking-widest ${common.calcMode === m ? "bg-indigo-500/20 text-indigo-300" : "text-white/40 hover:text-white/65 hover:bg-white/5"}`}
                >
                  {m === "cpa" ? "CPA" : "ROAS"}
                </button>
              ))}
            </div>

            {common.calcMode === "cpa" ? (
              <Field label="CPA Target" value={common.cpaTarget}
                onChange={v => setC("cpaTarget", v)} suffix="lei"
                hint="Cost per client achiziționat (din Ads Manager)"
              />
            ) : (
              <Field label="ROAS Target" value={common.roasTarget}
                onChange={v => setC("roasTarget", v)} suffix="x" />
            )}
          </div>

          {/* RIGHT: offers + mix */}
          <div className="space-y-3">
            {mode === "catalog" && !selectedProductId && (
              <div className="rounded-xl border border-white/10 bg-white/2 p-8 flex items-center justify-center gap-3 text-white/30 text-sm">
                <TrendingUp className="w-5 h-5" />
                <span>Selectează un produs pentru a încărca ofertele.</span>
              </div>
            )}
            {mode === "catalog" && selectedProductId && catalogOffers.length === 0 && !loadingLPs && (
              <div className="rounded-xl border border-white/10 bg-white/2 p-8 flex items-center justify-center gap-3 text-white/30 text-sm">
                <Info className="w-5 h-5" />
                <span>Nu există landing pages pentru acest produs.</span>
              </div>
            )}
            {showOffers && results.map((res, idx) => (
              <OfferRow key={idx} index={idx} result={res} common={common}
                offer={activeOffers[idx]}
                onOfferChange={mode === "manual" ? (f, v) => updateOffer(idx, f, v) : undefined}
                isManual={mode === "manual"}
              />
            ))}
            {showOffers && <MixOferte results={results} common={common} />}
          </div>
        </div>
      </div>
    </div>
  );
}
