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
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; sku: string; }

interface LandingPage {
  id: string;
  name: string;
  offer_heading_1: string; offer_heading_2: string; offer_heading_3: string;
  numeral_1: number;       numeral_2: number;       numeral_3: number;
  price_1: number;         price_2: number;         price_3: number;
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
  const numeral   = Math.max(1, n(offer.numeral));
  const pretTotal = n(offer.pretTotal);
  const costProdus   = n(common.costProdus);
  const costCurier   = n(common.costCurier);
  const retur        = Math.min(0.99, Math.max(0, n(common.rataRetur) / 100));
  const roasTarget   = n(common.roasTarget);
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

  // return rate reduces revenue (only fulfilled orders pay)
  // product cost: fixed per order sent (returned products go back to stock, not a loss)
  // courier cost: fixed per order sent (paid on shipment regardless of outcome)
  const profitBrut    = (1 - retur) * revenueNet - numeral * costProdus - costCurier;

  const grossMedio    = (1 - retur) * revenueClient;
  const margineNeta   = grossMedio > 0 ? (profitBrut / grossMedio) * 100 : 0;
  const breakEvenRoas = profitBrut > 0 ? grossMedio / profitBrut : null;
  const cheltuialaReclame = roasTarget > 0 ? grossMedio / roasTarget : 0;
  const profitLaTarget    = profitBrut - cheltuialaReclame;

  return { label: offer.label, numeral, revenueClient, revenueNet, costComanda,
    profitBrut, margineNeta, breakEvenRoas, profitLaTarget,
    cheltuialaReclame, valid: true };
}

function roasColor(roas: number, be: number | null) {
  if (be === null) return "text-white/40";
  if (roas < be)         return "text-red-400";
  if (roas < be * 1.15)  return "text-amber-400";
  return "text-emerald-400";
}

function roasBg(roas: number, be: number | null) {
  if (be === null) return "";
  if (roas < be)         return "bg-red-500/5";
  if (roas < be * 1.15)  return "bg-amber-500/5";
  return "bg-emerald-500/5";
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle component (inline styles — reliable across all Tailwind versions)
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: "relative", display: "inline-flex", flexShrink: 0,
        width: 44, height: 24, borderRadius: 12,
        background: checked ? "#4f46e5" : "#2a2a3a",
        border: `1px solid ${checked ? "#6366f1" : "rgba(255,255,255,0.18)"}`,
        cursor: "pointer", transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Input field
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, suffix, hint, placeholder = "0",
}: {
  label: string; value: string; onChange?: (v: string) => void;
  suffix?: string; hint?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="number" value={value} placeholder={placeholder} step="any"
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/28 transition-colors pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">{suffix}</span>
        )}
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
// Accordion offer row
// ─────────────────────────────────────────────────────────────────────────────

function OfferRow({
  index, result, roasTarget, offer, onOfferChange, isManual, common,
}: {
  index: number; result: OfferResult; roasTarget: string;
  offer: Offer; onOfferChange?: (f: keyof Offer, v: string | boolean | number) => void;
  isManual: boolean; common: CommonInputs;
}) {
  const [open, setOpen] = useState(index === 0);

  const profitColor = !result.valid ? "text-white/30"
    : result.profitLaTarget > 0 ? "text-emerald-400"
    : result.profitLaTarget < 0 ? "text-red-400" : "text-amber-400";

  const breakColor = !result.valid ? "text-white/30"
    : result.breakEvenRoas === null ? "text-red-400"
    : result.breakEvenRoas > 5 ? "text-amber-400" : "text-emerald-400";

  // ROAS table
  const rows = useMemo(() => {
    const arr = [];
    for (let r = 1.0; r <= 8.0; r = parseFloat((r + 0.5).toFixed(1))) {
      const grossMedio = result.valid ? (1 - n(common.rataRetur) / 100) * result.revenueClient : 0;
      const cheltuiala = result.valid && grossMedio > 0 ? grossMedio / r : 0;
      const profit     = result.valid ? result.profitBrut - cheltuiala : 0;
      const roi        = result.valid && grossMedio > 0 ? (profit / grossMedio) * 100 : 0;
      arr.push({ roas: r, cheltuiala, profit, roi });
    }
    return arr;
  }, [result, common.rataRetur]);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left"
      >
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest w-16 shrink-0">
          Oferta {index + 1}
        </span>

        {/* Offer details */}
        <div className="flex-1 flex items-center gap-4 min-w-0 text-xs">
          {isManual ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="number" min={1} value={offer.numeral} placeholder="1"
                onChange={(e) => onOfferChange?.("numeral", parseInt(e.target.value) || 1)}
                className="w-12 bg-white/5 border border-white/12 rounded px-1.5 py-1 text-white text-xs focus:outline-none"
              />
              <span className="text-white/30">buc ×</span>
              <input
                type="number" value={offer.pretTotal} placeholder="preț"
                onChange={(e) => onOfferChange?.("pretTotal", e.target.value)}
                className="w-20 bg-white/5 border border-white/12 rounded px-1.5 py-1 text-white text-xs focus:outline-none"
              />
              <span className="text-white/30">lei</span>
              <label className="flex items-center gap-1 cursor-pointer ml-1">
                <input
                  type="checkbox" checked={offer.freeShipping}
                  onChange={(e) => onOfferChange?.("freeShipping", e.target.checked)}
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
              {offer.freeShipping && (
                <span className="text-indigo-400 text-[10px] font-semibold">Livrare gratuită</span>
              )}
            </div>
          )}
        </div>

        {/* Key metrics preview */}
        {result.valid && (
          <div className="hidden sm:flex items-center gap-6 shrink-0">
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
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-white/25 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {/* Expanded content */}
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
                {[
                  {
                    label: "Breakeven ROAS",
                    value: result.breakEvenRoas !== null ? `${fmt(result.breakEvenRoas)}x` : "N/A",
                    color: breakColor, big: true,
                  },
                  {
                    label: `Profit @ ${roasTarget}x ROAS`,
                    value: `${fmt(result.profitLaTarget)} lei`,
                    color: profitColor, big: true,
                  },
                  {
                    label: "Marjă netă",
                    value: `${fmt(result.margineNeta)}%`,
                    color: result.margineNeta > 0 ? "text-white/75" : "text-red-400",
                  },
                  {
                    label: "Profit brut / cmd",
                    value: `${fmt(result.profitBrut)} lei`,
                    color: result.profitBrut > 0 ? "text-white/75" : "text-red-400",
                  },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-white/4 border border-white/8 p-3">
                    <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">{m.label}</p>
                    <p className={`font-bold ${m.big ? "text-xl" : "text-base"} ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Cost breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <span>Cost curier</span>
                    <span className="text-white/70 font-medium">{fmt(n(common.costCurier))} lei</span>
                  </div>
                  <div className="flex justify-between text-white/50 text-[11px]">
                    <span>Rată retur aplicată</span>
                    <span>{common.rataRetur}%</span>
                  </div>
                  <div className="flex justify-between text-white/50 border-t border-white/6 pt-1.5 mt-1.5">
                    <span>Reclame / cmd @ {roasTarget}x</span>
                    <span className="text-white/60">{fmt(result.cheltuialaReclame)} lei</span>
                  </div>
                </div>

                {/* ROAS table */}
                <div className="rounded-lg overflow-hidden border border-white/8">
                  <div className="grid grid-cols-4 px-3 py-2 text-[10px] font-semibold text-white/25 uppercase tracking-wide bg-white/3">
                    <span>ROAS</span>
                    <span className="text-right">Reclame</span>
                    <span className="text-right">Profit</span>
                    <span className="text-right">ROI%</span>
                  </div>
                  {rows.map(({ roas, cheltuiala, profit, roi }) => {
                    const isTarget = fmt(roas, 1) === fmt(n(roasTarget), 1);
                    const isBreak  = result.breakEvenRoas !== null && Math.abs(roas - result.breakEvenRoas) < 0.26;
                    return (
                      <div
                        key={roas}
                        className={`grid grid-cols-4 px-3 py-1.5 text-xs border-t border-white/5 ${roasBg(roas, result.breakEvenRoas)} ${isTarget ? "ring-1 ring-inset ring-indigo-500/30" : ""}`}
                      >
                        <span className={`font-semibold ${roasColor(roas, result.breakEvenRoas)}`}>
                          {fmt(roas, 1)}x
                          {isTarget && <span className="ml-1 text-[9px] text-indigo-400">▶</span>}
                          {isBreak && !isTarget && <span className="ml-1 text-[9px] text-amber-400">●</span>}
                        </span>
                        <span className="text-right text-white/35">{fmt(cheltuiala)}</span>
                        <span className={`text-right font-medium ${roasColor(roas, result.breakEvenRoas)}`}>
                          {profit >= 0 ? "+" : ""}{fmt(profit)}
                        </span>
                        <span className={`text-right font-medium ${roasColor(roas, result.breakEvenRoas)}`}>
                          {roi >= 0 ? "+" : ""}{fmt(roi, 1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warnings */}
              {result.breakEvenRoas === null && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-2.5 text-sm text-red-300/80">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>Marja negativă — costurile depășesc venitul chiar și fără reclame.</span>
                </div>
              )}
              {result.breakEvenRoas !== null && result.breakEvenRoas > 4 && (
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
  platitorTVA: false, roasTarget: "3.5", shippingPrice: "0",
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
  const activeRole    = (session?.user as any)?.activeRole;
  const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;

  const [mode, setMode] = useState<"catalog" | "manual">("manual");
  const [common, setCommon] = useState<CommonInputs>(DEFAULT_COMMON);
  const [manualOffers, setManualOffers] = useState<Offer[]>(DEFAULT_OFFERS);

  const [products, setProducts]               = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [landingPages, setLandingPages]       = useState<LandingPage[]>([]);
  const [loadingLPs, setLoadingLPs]           = useState(false);
  const [selectedLPId, setSelectedLPId]       = useState("");
  const [catalogOffers, setCatalogOffers]     = useState<Offer[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || activeRole !== "owner" || !isSuperadminOrg) {
      router.replace("/admin/orders");
    }
  }, [status, session, activeRole, isSuperadminOrg, router]);

  useEffect(() => {
    if (mode !== "catalog") return;
    setLoadingProducts(true);
    fetch("/api/products/active")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [mode]);

  useEffect(() => {
    if (!selectedProductId) { setLandingPages([]); setSelectedLPId(""); return; }
    setLoadingLPs(true);
    fetch("/api/landing-pages?limit=100")
      .then((r) => r.json())
      .then((d) => {
        const filtered = (d.landingPages ?? []).filter((lp: any) => lp.product_id === selectedProductId);
        setLandingPages(filtered);
        setSelectedLPId(filtered.length > 0 ? filtered[0].id : "");
      })
      .catch(() => setLandingPages([]))
      .finally(() => setLoadingLPs(false));
  }, [selectedProductId]);

  useEffect(() => {
    const lp = landingPages.find((l) => l.id === selectedLPId);
    if (!lp) { setCatalogOffers([]); return; }
    setCatalogOffers([
      { label: "Oferta 1", numeral: n(lp.numeral_1) || 1, pretTotal: String(n(lp.price_1)), freeShipping: !!lp.free_shipping_offer_1 },
      { label: "Oferta 2", numeral: n(lp.numeral_2) || 2, pretTotal: String(n(lp.price_2)), freeShipping: !!lp.free_shipping_offer_2 },
      { label: "Oferta 3", numeral: n(lp.numeral_3) || 3, pretTotal: String(n(lp.price_3)), freeShipping: !!lp.free_shipping_offer_3 },
    ]);
    setCommon((prev) => ({ ...prev, shippingPrice: String(n(lp.shipping_price)) }));
  }, [selectedLPId, landingPages]);

  const setC = (key: keyof CommonInputs, val: string | boolean) =>
    setCommon((prev) => ({ ...prev, [key]: val }));

  const updateOffer = (idx: number, field: keyof Offer, val: string | boolean | number) =>
    setManualOffers((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));

  const activeOffers = mode === "catalog" ? catalogOffers : manualOffers;

  const results = useMemo(
    () => activeOffers.map((offer) => calcOffer(offer, common)),
    [activeOffers, common]
  );

  if (status === "loading" || !session?.user) return null;

  return (
    <div className="min-h-screen bg-[#0f0f14] p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30">
            <Calculator className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Calculator ROAS</h1>
            <p className="text-xs text-white/40 mt-0.5">Analiză profitabilitate per ofertă</p>
          </div>
          <span className="ml-auto px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wide">Beta</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 items-start">

          {/* ── LEFT: inputs ────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5 space-y-4 xl:sticky xl:top-6">

            {/* TVA — first, centered */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${!common.platitorTVA ? "text-white/65" : "text-white/25"}`}>
                  Neplătitor TVA
                </span>
                <Toggle checked={common.platitorTVA} onChange={() => setC("platitorTVA", !common.platitorTVA)} />
                <span className={`text-sm font-medium ${common.platitorTVA ? "text-white/65" : "text-white/25"}`}>
                  Plătitor TVA 21%
                </span>
              </div>
              {common.platitorTVA && (
                <div className="w-full rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-3 py-2 text-[11px] text-indigo-300/75 space-y-0.5">
                  <p><strong className="text-indigo-300">Prețuri de vânzare</strong> → cu TVA inclus (prețul clientului)</p>
                  <p><strong className="text-indigo-300">Cost produs & curier</strong> → fără TVA (suma netă)</p>
                </div>
              )}
            </div>

            <Divider label="Sursă prețuri" />

            {/* Mode */}
            <div className="flex rounded-lg overflow-hidden border border-white/12">
              {(["catalog", "manual"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    mode === m ? "bg-indigo-500/20 text-indigo-300" : "text-white/40 hover:text-white/65 hover:bg-white/5"
                  }`}
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
                    <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 appearance-none pr-7"
                    >
                      <option value="" className="bg-[#1a1a24]">{loadingProducts ? "Se încarcă..." : "Selectează produs"}</option>
                      {products.map((p) => <option key={p.id} value={p.id} className="bg-[#1a1a24]">{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  </div>
                </div>
                {selectedProductId && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-white/45 uppercase tracking-wide">Landing Page</label>
                    <div className="relative">
                      <select value={selectedLPId} onChange={(e) => setSelectedLPId(e.target.value)}
                        disabled={loadingLPs || landingPages.length === 0}
                        className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 appearance-none pr-7 disabled:opacity-40"
                      >
                        {loadingLPs && <option className="bg-[#1a1a24]">Se încarcă...</option>}
                        {!loadingLPs && landingPages.length === 0 && <option className="bg-[#1a1a24]">Nicio landing page</option>}
                        {landingPages.map((lp) => <option key={lp.id} value={lp.id} className="bg-[#1a1a24]">{lp.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <Divider label="Costuri" />

            <Field label="Cost produs / bucată" value={common.costProdus}
              onChange={(v) => setC("costProdus", v)} suffix="lei"
              hint={common.platitorTVA ? "Fără TVA" : "Cu TVA inclus"}
            />
            <Field label="Cost curier" value={common.costCurier}
              onChange={(v) => setC("costCurier", v)} suffix="lei"
              hint={common.platitorTVA ? "Fără TVA (deductibil)" : "Cu TVA inclus"}
            />
            {mode === "manual" && (
              <Field label="Preț transport client" value={common.shippingPrice}
                onChange={(v) => setC("shippingPrice", v)} suffix="lei"
                hint="0 dacă livrare gratuită pe toate ofertele"
              />
            )}

            <Divider label="Parametri" />

            <Field label="Rată retur" value={common.rataRetur}
              onChange={(v) => setC("rataRetur", v)} suffix="%"
            />

            <Divider label="ROAS Target" />

            <Field label="ROAS Target" value={common.roasTarget}
              onChange={(v) => setC("roasTarget", v)} suffix="x"
            />
          </div>

          {/* ── RIGHT: accordion offers ─────────────────────────────────── */}
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
            {(mode === "manual" || catalogOffers.length > 0) &&
              results.map((res, idx) => (
                <OfferRow
                  key={idx} index={idx} result={res}
                  roasTarget={common.roasTarget}
                  offer={activeOffers[idx]}
                  onOfferChange={mode === "manual" ? (f, v) => updateOffer(idx, f, v) : undefined}
                  isManual={mode === "manual"}
                  common={common}
                />
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
