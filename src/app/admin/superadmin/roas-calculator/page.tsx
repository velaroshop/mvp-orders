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
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface LandingPage {
  id: string;
  name: string;
  offer_heading_1: string;
  offer_heading_2: string;
  offer_heading_3: string;
  numeral_1: number;
  numeral_2: number;
  numeral_3: number;
  price_1: number;
  price_2: number;
  price_3: number;
  shipping_price: number;
  free_shipping_offer_1: boolean;
  free_shipping_offer_2: boolean;
  free_shipping_offer_3: boolean;
}

// An "offer" as seen by the calculator
interface Offer {
  label: string;       // e.g. "Pachet 2 buc"
  numeral: number;     // quantity
  pretTotal: string;   // total price customer pays (editable in manual mode)
  freeShipping: boolean;
}

interface CommonInputs {
  costProdus: string;   // per unit
  costCurier: string;   // real cost we pay (net if TVA payer)
  rataRetur: string;
  platitorTVA: boolean;
  roasTarget: string;
  shippingPrice: string; // shown to customer (only matters when !freeShipping)
}

interface OfferResult {
  label: string;
  numeral: number;
  revenueClient: number;   // total the customer pays
  revenueNet: number;      // after TVA (= revenueClient if not TVA payer)
  costComanda: number;     // numeral*costProdus + costCurier
  profitBrut: number;      // weighted after retur
  margineNeta: number;     // %
  breakEvenRoas: number | null;
  profitLaTarget: number;
  cheltuialaReclame: number;
  valid: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TVA = 0.21;

function n(val: string | number): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const parsed = parseFloat(String(val).replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
}

function fmt(val: number, decimals = 2): string {
  return val.toFixed(decimals).replace(".", ",");
}

function calcOffer(offer: Offer, common: CommonInputs): OfferResult {
  const numeral = offer.numeral;
  const costProdus = n(common.costProdus);
  const costCurier = n(common.costCurier);
  const retur = Math.min(99, Math.max(0, n(common.rataRetur))) / 100;
  const roasTarget = n(common.roasTarget);
  const tva = common.platitorTVA;
  const shippingPrice = n(common.shippingPrice);
  const pretTotal = n(offer.pretTotal);

  if (pretTotal <= 0 || costProdus <= 0 || costCurier <= 0 || numeral <= 0) {
    return {
      label: offer.label,
      numeral,
      revenueClient: 0,
      revenueNet: 0,
      costComanda: 0,
      profitBrut: 0,
      margineNeta: 0,
      breakEvenRoas: null,
      profitLaTarget: 0,
      cheltuialaReclame: 0,
      valid: false,
    };
  }

  // Total the customer actually pays
  const revenueClient = pretTotal + (offer.freeShipping ? 0 : shippingPrice);

  // What we keep after TVA
  const revenueNet = tva ? revenueClient / (1 + TVA) : revenueClient;

  // Our cost per successful order
  const costComanda = numeral * costProdus + costCurier;

  // Profit per order, weighted after returns
  // Returned orders: we lose outbound courier; product comes back to stock
  const profitBrut =
    (1 - retur) * (revenueNet - costComanda) - retur * costCurier;

  // Margin on gross revenue (weighted for returns)
  const grossMedio = (1 - retur) * revenueClient;
  const margineNeta = grossMedio > 0 ? (profitBrut / grossMedio) * 100 : 0;

  // Breakeven ROAS (on gross revenue, as Meta/Google report)
  const breakEvenRoas = profitBrut > 0 ? grossMedio / profitBrut : null;

  // Profit at target ROAS
  const cheltuialaReclame = roasTarget > 0 ? grossMedio / roasTarget : 0;
  const profitLaTarget = profitBrut - cheltuialaReclame;

  return {
    label: offer.label,
    numeral,
    revenueClient,
    revenueNet,
    costComanda,
    profitBrut,
    margineNeta,
    breakEvenRoas,
    profitLaTarget,
    cheltuialaReclame,
    valid: true,
  };
}

function roasColor(roas: number, breakeven: number | null): string {
  if (breakeven === null) return "text-white/50";
  if (roas < breakeven) return "text-red-400";
  if (roas < breakeven * 1.15) return "text-amber-400";
  return "text-emerald-400";
}

function roasBg(roas: number, breakeven: number | null): string {
  if (breakeven === null) return "bg-white/5";
  if (roas < breakeven) return "bg-red-500/8";
  if (roas < breakeven * 1.15) return "bg-amber-500/8";
  return "bg-emerald-500/8";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  suffix,
  hint,
  placeholder = "0",
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/55 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          step="any"
          className={`w-full border rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none transition-colors pr-10 ${
            readOnly
              ? "bg-white/3 border-white/8 text-white/50 cursor-default"
              : "bg-white/5 border-white/12 focus:border-white/30 focus:bg-white/8"
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-white/30 leading-tight">{hint}</p>}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

function OfferColumn({
  result,
  roasTarget,
  offer,
  onOfferChange,
  isManual,
  commonInputs,
}: {
  result: OfferResult;
  roasTarget: string;
  offer: Offer;
  onOfferChange?: (field: keyof Offer, value: string | boolean | number) => void;
  isManual: boolean;
  commonInputs: CommonInputs;
}) {
  // Build ROAS table rows for this offer
  const rows = [];
  for (let r = 1.0; r <= 8.0; r += 0.5) {
    const roas = parseFloat(r.toFixed(1));
    const grossMedio = result.valid ? (1 - n(commonInputs.rataRetur) / 100) * result.revenueClient : 0;
    const cheltuiala = result.valid && grossMedio > 0 ? grossMedio / roas : 0;
    const profit = result.valid ? result.profitBrut - cheltuiala : 0;
    rows.push({ roas, cheltuiala, profit });
  }

  const profitColor =
    !result.valid ? "text-white/40" :
    result.profitLaTarget > 0 ? "text-emerald-400" :
    result.profitLaTarget < 0 ? "text-red-400" : "text-amber-400";

  const breakColor =
    !result.valid ? "text-white/40" :
    result.breakEvenRoas === null ? "text-red-400" :
    result.breakEvenRoas > 5 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/2 overflow-hidden">
      {/* Offer header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/8 bg-white/2">
        {isManual ? (
          <input
            type="text"
            value={offer.label}
            onChange={(e) => onOfferChange?.("label", e.target.value)}
            placeholder="Denumire ofertă"
            className="w-full bg-transparent text-sm font-semibold text-white placeholder-white/25 focus:outline-none border-b border-white/15 pb-1 mb-2"
          />
        ) : (
          <p className="text-sm font-semibold text-white mb-2 truncate">{offer.label}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-white/45">
          {isManual ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-white/30">Buc:</span>
                <input
                  type="number"
                  value={offer.numeral}
                  min={1}
                  onChange={(e) => onOfferChange?.("numeral", parseInt(e.target.value) || 1)}
                  className="w-12 bg-white/5 border border-white/12 rounded px-1.5 py-0.5 text-white text-xs focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white/30">Preț:</span>
                <input
                  type="number"
                  value={offer.pretTotal}
                  placeholder="0"
                  onChange={(e) => onOfferChange?.("pretTotal", e.target.value)}
                  className="w-20 bg-white/5 border border-white/12 rounded px-1.5 py-0.5 text-white text-xs focus:outline-none"
                />
                <span className="text-white/30">lei</span>
              </div>
            </>
          ) : (
            <>
              <span><span className="text-white/30">Buc:</span> <strong className="text-white/70">{offer.numeral}</strong></span>
              <span><span className="text-white/30">Preț:</span> <strong className="text-white/70">{fmt(n(offer.pretTotal))} lei</strong></span>
            </>
          )}
          <label className="flex items-center gap-1 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={offer.freeShipping}
              onChange={(e) => onOfferChange?.("freeShipping", e.target.checked)}
              disabled={!isManual}
              className="w-3 h-3 accent-indigo-500"
            />
            <span className={offer.freeShipping ? "text-indigo-300" : "text-white/30"}>
              Livrare gratuită
            </span>
          </label>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1">
        {!result.valid ? (
          <div className="flex items-center gap-2 text-white/30 text-xs py-4">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Completează costurile și prețul ofertei.</span>
          </div>
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/4 border border-white/8 p-3 text-center">
                <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Breakeven ROAS</p>
                <p className={`text-2xl font-bold ${breakColor}`}>
                  {result.breakEvenRoas !== null ? `${fmt(result.breakEvenRoas)}x` : "N/A"}
                </p>
              </div>
              <div className="rounded-lg bg-white/4 border border-white/8 p-3 text-center">
                <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Profit @ {roasTarget}x</p>
                <p className={`text-2xl font-bold ${profitColor}`}>
                  {fmt(result.profitLaTarget)} lei
                </p>
              </div>
            </div>

            {/* Secondary metrics */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-white/50">
                <span>Venit client</span>
                <span className="text-white/70 font-medium">{fmt(result.revenueClient)} lei</span>
              </div>
              {commonInputs.platitorTVA && (
                <div className="flex justify-between text-white/50">
                  <span>Venit net (fără TVA)</span>
                  <span className="text-white/70 font-medium">{fmt(result.revenueNet)} lei</span>
                </div>
              )}
              <div className="flex justify-between text-white/50">
                <span>Cost comandă ({offer.numeral} buc + curier)</span>
                <span className="text-white/70 font-medium">{fmt(result.costComanda)} lei</span>
              </div>
              <div className="flex justify-between text-white/50 pt-1 border-t border-white/6">
                <span>Profit brut / cmd (după retur)</span>
                <span className={`font-semibold ${result.profitBrut > 0 ? "text-white/80" : "text-red-400"}`}>
                  {fmt(result.profitBrut)} lei
                </span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Marjă netă</span>
                <span className={`font-semibold ${result.margineNeta > 0 ? "text-white/80" : "text-red-400"}`}>
                  {fmt(result.margineNeta)}%
                </span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Reclame / cmd @ {roasTarget}x</span>
                <span className="text-white/60">{fmt(result.cheltuialaReclame)} lei</span>
              </div>
            </div>

            {/* Mini ROAS table */}
            <div className="rounded-lg overflow-hidden border border-white/8 mt-2">
              <div className="grid grid-cols-4 px-3 py-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-wide bg-white/3">
                <span>ROAS</span>
                <span className="text-right">Reclame</span>
                <span className="text-right">Profit</span>
                <span className="text-right">ROI%</span>
              </div>
              {rows.map(({ roas, cheltuiala, profit }) => {
                const isTarget = fmt(roas, 1) === fmt(n(roasTarget), 1);
                const isBreak = result.breakEvenRoas !== null && Math.abs(roas - result.breakEvenRoas) < 0.26;
                // ROI% = profit / gross revenue × 100
                const roi = result.revenueClient > 0
                  ? (profit / ((1 - n(commonInputs.rataRetur) / 100) * result.revenueClient)) * 100
                  : 0;
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
                    <span className="text-right text-white/40">{fmt(cheltuiala)}</span>
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

            {/* Warnings */}
            {result.breakEvenRoas === null && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-300/80">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                <span>Marja negativă — costurile depășesc venitul.</span>
              </div>
            )}
            {result.breakEvenRoas !== null && result.breakEvenRoas > 4 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-300/80">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>Breakeven ridicat — verifică costurile.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default states
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_COMMON: CommonInputs = {
  costProdus: "",
  costCurier: "",
  rataRetur: "15",
  platitorTVA: false,
  roasTarget: "3.5",
  shippingPrice: "0",
};

const DEFAULT_MANUAL_OFFERS: Offer[] = [
  { label: "Oferta 1", numeral: 1, pretTotal: "", freeShipping: false },
  { label: "Oferta 2", numeral: 2, pretTotal: "", freeShipping: false },
  { label: "Oferta 3", numeral: 3, pretTotal: "", freeShipping: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function RoasCalculatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const activeRole = (session?.user as any)?.activeRole;
  const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;

  const [mode, setMode] = useState<"catalog" | "manual">("manual");
  const [common, setCommon] = useState<CommonInputs>(DEFAULT_COMMON);
  const [manualOffers, setManualOffers] = useState<Offer[]>(DEFAULT_MANUAL_OFFERS);

  // Catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [loadingLPs, setLoadingLPs] = useState(false);
  const [selectedLPId, setSelectedLPId] = useState("");
  const [catalogOffers, setCatalogOffers] = useState<Offer[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || activeRole !== "owner" || !isSuperadminOrg) {
      router.replace("/admin/orders");
    }
  }, [status, session, activeRole, isSuperadminOrg, router]);

  // Fetch products when switching to catalog
  useEffect(() => {
    if (mode !== "catalog") return;
    setLoadingProducts(true);
    fetch("/api/products/active")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [mode]);

  // Fetch landing pages when product changes
  useEffect(() => {
    if (!selectedProductId) { setLandingPages([]); setSelectedLPId(""); return; }
    setLoadingLPs(true);
    fetch("/api/landing-pages?limit=100")
      .then((r) => r.json())
      .then((d) => {
        const filtered = (d.landingPages ?? []).filter(
          (lp: any) => lp.product_id === selectedProductId
        );
        setLandingPages(filtered);
        if (filtered.length > 0) setSelectedLPId(filtered[0].id);
        else setSelectedLPId("");
      })
      .catch(() => setLandingPages([]))
      .finally(() => setLoadingLPs(false));
  }, [selectedProductId]);

  // Build catalog offers when LP changes
  useEffect(() => {
    const lp = landingPages.find((l) => l.id === selectedLPId);
    if (!lp) { setCatalogOffers([]); return; }
    setCatalogOffers([
      {
        label: lp.offer_heading_1,
        numeral: lp.numeral_1,
        pretTotal: String(lp.price_1),
        freeShipping: lp.free_shipping_offer_1,
      },
      {
        label: lp.offer_heading_2,
        numeral: lp.numeral_2,
        pretTotal: String(lp.price_2),
        freeShipping: lp.free_shipping_offer_2,
      },
      {
        label: lp.offer_heading_3,
        numeral: lp.numeral_3,
        pretTotal: String(lp.price_3),
        freeShipping: lp.free_shipping_offer_3,
      },
    ]);
    // Sync shipping price from LP
    setCommon((prev) => ({ ...prev, shippingPrice: String(lp.shipping_price) }));
  }, [selectedLPId, landingPages]);

  const setC = (key: keyof CommonInputs, val: string | boolean) =>
    setCommon((prev) => ({ ...prev, [key]: val }));

  const updateManualOffer = (idx: number, field: keyof Offer, val: string | boolean | number) =>
    setManualOffers((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: val } : o));

  const activeOffers = mode === "catalog" ? catalogOffers : manualOffers;

  const results = useMemo(
    () => activeOffers.map((offer) => calcOffer(offer, common)),
    [activeOffers, common]
  );

  const selectedLP = landingPages.find((l) => l.id === selectedLPId);

  if (status === "loading" || !session?.user) return null;

  return (
    <div className="min-h-screen bg-[#0f0f14] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30">
            <Calculator className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Calculator ROAS</h1>
            <p className="text-xs text-white/40 mt-0.5">Analiză profitabilitate per ofertă de preț</p>
          </div>
          <span className="ml-auto px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wide">
            Beta
          </span>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 items-start">

          {/* ── LEFT: Common inputs ──────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5 space-y-4 sticky top-6">

            {/* TVA toggle — first, centered */}
            <div className="flex flex-col items-center gap-2 pb-1">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium transition-colors ${!common.platitorTVA ? "text-white/70" : "text-white/30"}`}>
                  Neplătitor TVA
                </span>
                <button
                  onClick={() => setC("platitorTVA", !common.platitorTVA)}
                  className={`relative shrink-0 rounded-full transition-all duration-200 ${
                    common.platitorTVA
                      ? "bg-indigo-600 border border-indigo-500"
                      : "bg-[#2a2a3a] border border-white/20"
                  }`}
                  style={{ width: 44, height: 24 }}
                >
                  <span
                    className={`absolute top-0.75 w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      common.platitorTVA ? "translate-x-5.5" : "translate-x-0.75"
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium transition-colors ${common.platitorTVA ? "text-white/70" : "text-white/30"}`}>
                  Plătitor TVA 21%
                </span>
              </div>
              {common.platitorTVA && (
                <div className="w-full rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-3 py-2 text-[11px] text-indigo-300/80 space-y-0.5">
                  <p><strong className="text-indigo-300">Prețuri vânzare</strong> → introdu <strong className="text-indigo-300">cu TVA inclus</strong> (prețul clientului)</p>
                  <p><strong className="text-indigo-300">Cost produs & curier</strong> → introdu <strong className="text-indigo-300">fără TVA</strong> (TVA-ul este deductibil)</p>
                </div>
              )}
            </div>

            <Divider label="Mod" />

            {/* Mode toggle */}
            <div>
              <label className="block text-xs font-medium text-white/55 uppercase tracking-wide mb-2">Sursă prețuri</label>
              <div className="flex rounded-lg overflow-hidden border border-white/12">
                {(["catalog", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium transition-colors ${
                      mode === m
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-white/40 hover:text-white/65 hover:bg-white/5"
                    }`}
                  >
                    {m === "catalog" ? <Package className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                    {m === "catalog" ? "Din catalog" : "Manual"}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog selects */}
            {mode === "catalog" && (
              <div className="space-y-3">
                {/* Product select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/55 uppercase tracking-wide">Produs</label>
                  <div className="relative">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 appearance-none pr-7"
                    >
                      <option value="" className="bg-[#1a1a24]">
                        {loadingProducts ? "Se încarcă..." : "Selectează produs"}
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#1a1a24]">
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  </div>
                </div>

                {/* Landing page select */}
                {selectedProductId && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/55 uppercase tracking-wide">Landing Page</label>
                    <div className="relative">
                      <select
                        value={selectedLPId}
                        onChange={(e) => setSelectedLPId(e.target.value)}
                        disabled={loadingLPs || landingPages.length === 0}
                        className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 appearance-none pr-7 disabled:opacity-40"
                      >
                        {loadingLPs && <option className="bg-[#1a1a24]">Se încarcă...</option>}
                        {!loadingLPs && landingPages.length === 0 && (
                          <option className="bg-[#1a1a24]">Nicio landing page</option>
                        )}
                        {landingPages.map((lp) => (
                          <option key={lp.id} value={lp.id} className="bg-[#1a1a24]">{lp.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                    {selectedLP && (
                      <p className="text-[11px] text-white/30">
                        Transport: {selectedLP.shipping_price > 0 ? `${selectedLP.shipping_price} lei` : "—"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <Divider label="Costuri" />

            <Field
              label="Cost produs / bucată"
              value={common.costProdus}
              onChange={(v) => setC("costProdus", v)}
              suffix="lei"
              hint={common.platitorTVA ? "Suma fără TVA" : "Suma cu TVA inclusă"}
            />

            <Field
              label="Cost curier"
              value={common.costCurier}
              onChange={(v) => setC("costCurier", v)}
              suffix="lei"
              hint={common.platitorTVA ? "Suma fără TVA — TVA deductibil" : "Suma totală cu TVA"}
            />

            {/* Shipping price — only relevant in manual mode (in catalog it comes from LP) */}
            {mode === "manual" && (
              <Field
                label="Preț transport client"
                value={common.shippingPrice}
                onChange={(v) => setC("shippingPrice", v)}
                suffix="lei"
                hint="Suma pe care o plătește clientul (0 dacă e gratuit)"
              />
            )}

            <Divider label="Parametri" />

            <Field
              label="Rată retur"
              value={common.rataRetur}
              onChange={(v) => setC("rataRetur", v)}
              suffix="%"
            />

            <Divider label="ROAS Target" />

            <Field
              label="ROAS Target"
              value={common.roasTarget}
              onChange={(v) => setC("roasTarget", v)}
              suffix="x"
            />
          </div>

          {/* ── RIGHT: 3 offer columns ──────────────────────────────── */}
          <div>
            {mode === "catalog" && !selectedProductId && (
              <div className="rounded-2xl border border-white/10 bg-white/2 p-8 flex items-center justify-center gap-3 text-white/30 text-sm">
                <TrendingUp className="w-5 h-5" />
                <span>Selectează un produs pentru a încărca ofertele de preț.</span>
              </div>
            )}
            {mode === "catalog" && selectedProductId && catalogOffers.length === 0 && !loadingLPs && (
              <div className="rounded-2xl border border-white/10 bg-white/2 p-8 flex items-center justify-center gap-3 text-white/30 text-sm">
                <Info className="w-5 h-5" />
                <span>Nu există landing pages pentru acest produs.</span>
              </div>
            )}

            {(mode === "manual" || (mode === "catalog" && catalogOffers.length > 0)) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {results.map((res, idx) => (
                  <OfferColumn
                    key={idx}
                    result={res}
                    roasTarget={common.roasTarget}
                    offer={activeOffers[idx]}
                    onOfferChange={mode === "manual" ? (field, val) => updateManualOffer(idx, field, val) : undefined}
                    isManual={mode === "manual"}
                    commonInputs={common}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
