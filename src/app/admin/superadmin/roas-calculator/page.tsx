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

interface Inputs {
  mode: "catalog" | "manual";
  selectedProductId: string;
  productLabel: string;
  costProdus: string;
  pretVanzare: string;
  rataRetur: string;
  platitorTVA: boolean;
  costCurier: string;
  roasTarget: string;
}

interface CalcResult {
  venitNetPerComanda: number;
  costPerComandaCompleta: number;
  costPerComandaReturnata: number;
  profitBrutPerComanda: number;
  margineNeta: number;
  breakEvenRoas: number | null;
  profitLaRoasTarget: number;
  cheltuialaReclameLaRoasTarget: number;
  valid: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TVA = 0.21;

function n(val: string): number {
  const parsed = parseFloat(val.replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
}

function fmt(val: number, decimals = 2): string {
  return val.toFixed(decimals).replace(".", ",");
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

function calculate(inputs: Inputs): CalcResult {
  const pret = n(inputs.pretVanzare);
  const cost = n(inputs.costProdus);
  const retur = Math.min(99, Math.max(0, n(inputs.rataRetur))) / 100;
  const curier = n(inputs.costCurier);
  const roasTarget = n(inputs.roasTarget);
  const tva = inputs.platitorTVA;

  if (pret <= 0 || cost <= 0 || curier <= 0) {
    return {
      venitNetPerComanda: 0,
      costPerComandaCompleta: 0,
      costPerComandaReturnata: 0,
      profitBrutPerComanda: 0,
      margineNeta: 0,
      breakEvenRoas: null,
      profitLaRoasTarget: 0,
      cheltuialaReclameLaRoasTarget: 0,
      valid: false,
    };
  }

  // Revenue
  // ROAS is always on gross selling price (as Meta/Google report it)
  const venitBrut = pret; // gross, for ROAS numerator
  const venitNet = tva ? pret / (1 + TVA) : pret; // net, for profit calc

  // Costs (user enters net if TVA payer, gross if non-payer)
  const costProdusFinal = cost;
  const costCurierFinal = curier;

  // Per successful order
  const costCompleta = costProdusFinal + costCurierFinal;

  // Per returned order (COD refused at door):
  // Return shipping is included in the outbound fee — no extra charge.
  // We only lose the outbound shipping cost; product comes back to stock.
  const costReturnata = costCurierFinal;

  // Weighted average profit per order (across all orders sent)
  // = (1-r) × (net_revenue - cost_complete) - r × cost_return
  const profitBrut =
    (1 - retur) * (venitNet - costCompleta) - retur * costReturnata;

  // Margin on gross revenue (weighted)
  const venitBrutMediu = (1 - retur) * venitBrut;
  const margineNeta = venitBrutMediu > 0 ? (profitBrut / venitBrutMediu) * 100 : 0;

  // Breakeven ROAS = gross revenue (per avg order) / profit before ads
  const breakEvenRoas = profitBrut > 0 ? venitBrutMediu / profitBrut : null;

  // Profit at ROAS target
  const cheltuialaReclame = roasTarget > 0 ? venitBrutMediu / roasTarget : 0;
  const profitLaRoas = profitBrut - cheltuialaReclame;

  return {
    venitNetPerComanda: venitNet,
    costPerComandaCompleta: costCompleta,
    costPerComandaReturnata: costReturnata,
    profitBrutPerComanda: profitBrut,
    margineNeta,
    breakEvenRoas,
    profitLaRoasTarget: profitLaRoas,
    cheltuialaReclameLaRoasTarget: cheltuialaReclame,
    valid: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  suffix,
  hint,
  placeholder = "0",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step="any"
          className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-colors pr-12"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/35 font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-white/35 leading-tight">{hint}</p>}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  highlight,
  color,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  color?: "green" | "red" | "amber" | "neutral";
  large?: boolean;
}) {
  const colorClass =
    color === "green" ? "text-emerald-400" :
    color === "red" ? "text-red-400" :
    color === "amber" ? "text-amber-400" :
    "text-white";

  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-indigo-500/30 bg-indigo-500/8" : "border-white/10 bg-white/[0.03]"}`}>
      <p className="text-xs text-white/45 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-bold ${large ? "text-3xl" : "text-xl"} ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-white/35 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: Inputs = {
  mode: "manual",
  selectedProductId: "",
  productLabel: "",
  costProdus: "",
  pretVanzare: "",
  rataRetur: "15",
  platitorTVA: false,
  costCurier: "",
  roasTarget: "3.5",
};

export default function RoasCalculatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const activeRole = (session?.user as any)?.activeRole;
  const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;

  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || activeRole !== "owner" || !isSuperadminOrg) {
      router.replace("/admin/orders");
    }
  }, [status, session, activeRole, isSuperadminOrg, router]);

  // Fetch products for catalog mode
  useEffect(() => {
    if (inputs.mode !== "catalog") return;
    setLoadingProducts(true);
    fetch("/api/products/active")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [inputs.mode]);

  const set = (key: keyof Inputs, value: string | boolean) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const result = useMemo(() => calculate(inputs), [inputs]);

  // ROAS table rows: 1.0 to 8.0 in steps of 0.5
  const roasTableRows = useMemo(() => {
    const rows = [];
    for (let r = 1.0; r <= 8.0; r += 0.5) {
      const roas = parseFloat(r.toFixed(1));
      const cheltuiala = result.valid
        ? (1 - n(inputs.rataRetur) / 100) * n(inputs.pretVanzare) / roas
        : 0;
      const profit = result.valid ? result.profitBrutPerComanda - cheltuiala : 0;
      rows.push({ roas, cheltuiala, profit });
    }
    return rows;
  }, [result, inputs.rataRetur, inputs.pretVanzare]);

  if (status === "loading" || !session?.user) return null;

  const isTargetRoas = parseFloat(inputs.roasTarget) > 0;
  const profitColor =
    !result.valid ? "neutral" :
    result.profitLaRoasTarget > 0 ? "green" :
    result.profitLaRoasTarget < 0 ? "red" : "amber";

  const breakEvenColor =
    !result.valid ? "neutral" :
    result.breakEvenRoas === null ? "red" :
    result.breakEvenRoas > 5 ? "amber" : "green";

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
            <p className="text-xs text-white/40 mt-0.5">Analiză profitabilitate per produs</p>
          </div>
          <span className="ml-auto px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wide">
            Beta
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">

          {/* ── LEFT: Inputs ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-6 space-y-5">

            {/* Mode toggle */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wide mb-2">
                Mod calcul
              </label>
              <div className="flex rounded-lg overflow-hidden border border-white/12">
                {(["catalog", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => set("mode", m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                      inputs.mode === m
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                        : "text-white/45 hover:text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {m === "catalog" ? <Package className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                    {m === "catalog" ? "Din catalog" : "Manual"}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog select */}
            {inputs.mode === "catalog" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
                  Produs
                </label>
                <div className="relative">
                  <select
                    value={inputs.selectedProductId}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      setInputs((prev) => ({
                        ...prev,
                        selectedProductId: e.target.value,
                        productLabel: prod?.name ?? "",
                      }));
                    }}
                    className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 appearance-none pr-8"
                  >
                    <option value="" className="bg-[#1a1a24]">
                      {loadingProducts ? "Se încarcă..." : "Selectează produs"}
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#1a1a24]">
                        {p.name} {p.sku ? `(${p.sku})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
                {inputs.productLabel && (
                  <p className="text-[11px] text-white/35">
                    Costurile se completează manual — nu sunt stocate în catalog.
                  </p>
                )}
              </div>
            )}

            <Divider label="Produs" />

            <InputField
              label="Cost produs"
              value={inputs.costProdus}
              onChange={(v) => set("costProdus", v)}
              suffix="lei"
              hint={inputs.platitorTVA ? "Introdu suma fără TVA (netă)" : "Introdu suma cu TVA inclusă"}
            />

            <InputField
              label="Preț vânzare — Oferta 1"
              value={inputs.pretVanzare}
              onChange={(v) => set("pretVanzare", v)}
              suffix="lei"
              hint="Transport inclus în preț"
            />

            <Divider label="Costuri operaționale" />

            <InputField
              label="Cost curier"
              value={inputs.costCurier}
              onChange={(v) => set("costCurier", v)}
              suffix="lei"
              hint={
                inputs.platitorTVA
                  ? "Introdu suma fără TVA — TVA-ul este deductibil"
                  : "Introdu suma totală cu TVA inclusă"
              }
            />

            <Divider label="Parametri" />

            <InputField
              label="Rată retur"
              value={inputs.rataRetur}
              onChange={(v) => set("rataRetur", v)}
              suffix="%"
              min={0}
              max={99}
              hint="% din comenzi refuzate sau returnate"
            />

            {/* TVA toggle */}
            <div className="flex items-center justify-between py-0.5">
              <div>
                <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Plătitor TVA</p>
                <p className="text-[11px] text-white/30 mt-0.5">Cotă 21%</p>
              </div>
              <button
                onClick={() => set("platitorTVA", !inputs.platitorTVA)}
                className={`relative w-10 h-5.5 rounded-full transition-colors border ${
                  inputs.platitorTVA
                    ? "bg-indigo-500/40 border-indigo-500/50"
                    : "bg-white/10 border-white/15"
                }`}
                style={{ height: "22px" }}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform bg-white shadow-sm ${
                    inputs.platitorTVA ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <Divider label="ROAS Target" />

            <InputField
              label="ROAS Target"
              value={inputs.roasTarget}
              onChange={(v) => set("roasTarget", v)}
              suffix="x"
              hint="Modifică pentru a vedea profitul la orice nivel ROAS"
            />
          </div>

          {/* ── RIGHT: Results ────────────────────────────────────────── */}
          <div className="space-y-4">

            {!result.valid && (
              <div className="rounded-xl border border-white/10 bg-white/3 p-6 flex items-center gap-3 text-white/40 text-sm">
                <Info className="w-4 h-4 shrink-0" />
                Completează cost produs, preț vânzare și cost curier pentru a vedea calculele.
              </div>
            )}

            {result.valid && (
              <>
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Breakeven ROAS"
                    value={result.breakEvenRoas !== null ? `${fmt(result.breakEvenRoas)}x` : "N/A"}
                    sub={
                      result.breakEvenRoas !== null
                        ? `Sub acest nivel pierzi bani`
                        : "Marjă negativă — imposibil de atins"
                    }
                    highlight
                    large
                    color={breakEvenColor}
                  />
                  <MetricCard
                    label={`Profit la ROAS ${inputs.roasTarget}x`}
                    value={isTargetRoas ? `${fmt(result.profitLaRoasTarget)} lei` : "—"}
                    sub={
                      isTargetRoas
                        ? `${fmt(result.cheltuialaReclameLaRoasTarget)} lei reclame / comandă`
                        : undefined
                    }
                    large
                    color={profitColor}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Marjă netă"
                    value={`${fmt(result.margineNeta)}%`}
                    sub="înainte de reclame"
                    color={result.margineNeta > 0 ? "green" : "red"}
                  />
                  <MetricCard
                    label="Profit brut / comandă"
                    value={`${fmt(result.profitBrutPerComanda)} lei`}
                    sub="medie după retur"
                    color={result.profitBrutPerComanda > 0 ? "neutral" : "red"}
                  />
                  <MetricCard
                    label="Venit net / comandă"
                    value={`${fmt(result.venitNetPerComanda)} lei`}
                    sub={inputs.platitorTVA ? "fără TVA 21%" : "fără TVA"}
                  />
                </div>

                {/* Cost breakdown */}
                <div className="rounded-xl border border-white/10 bg-white/3 p-4">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">
                    Detaliu costuri per comandă
                  </p>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Cost produs", val: n(inputs.costProdus) },
                      { label: "Cost curier (outbound)", val: n(inputs.costCurier) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between text-white/60">
                        <span>{row.label}</span>
                        <span className="text-white/80 font-medium">{fmt(row.val)} lei</span>
                      </div>
                    ))}
                    <div className="border-t border-white/8 pt-2 flex justify-between text-white/60">
                      <span>Cost retur (curier outbound pierdut)</span>
                      <span className="text-red-400 font-medium">{fmt(result.costPerComandaReturnata)} lei</span>
                    </div>
                    <div className="flex justify-between text-xs text-white/35 pt-1">
                      <span>Rată retur aplicată</span>
                      <span>{inputs.rataRetur}% din comenzi</span>
                    </div>
                  </div>
                </div>

                {/* ROAS table */}
                <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-white/40" />
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">
                      Profit per comandă în funcție de ROAS
                    </p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {/* Header */}
                    <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-wide">
                      <span>ROAS</span>
                      <span className="text-right">Reclame / comandă</span>
                      <span className="text-right">Profit / comandă</span>
                    </div>
                    {roasTableRows.map(({ roas, cheltuiala, profit }) => {
                      const isTarget = fmt(roas, 1) === fmt(n(inputs.roasTarget), 1);
                      const isBreakeven =
                        result.breakEvenRoas !== null &&
                        Math.abs(roas - result.breakEvenRoas) < 0.26;
                      return (
                        <div
                          key={roas}
                          className={`grid grid-cols-3 px-4 py-2.5 text-sm transition-colors ${roasBg(roas, result.breakEvenRoas)} ${isTarget ? "ring-1 ring-inset ring-indigo-500/30" : ""}`}
                        >
                          <span className={`font-semibold ${roasColor(roas, result.breakEvenRoas)}`}>
                            {fmt(roas, 1)}x
                            {isTarget && (
                              <span className="ml-1.5 text-[10px] text-indigo-400 font-medium">← target</span>
                            )}
                            {isBreakeven && (
                              <span className="ml-1.5 text-[10px] text-amber-400 font-medium">← breakeven</span>
                            )}
                          </span>
                          <span className="text-right text-white/55">{fmt(cheltuiala)} lei</span>
                          <span className={`text-right font-semibold ${roasColor(roas, result.breakEvenRoas)}`}>
                            {profit >= 0 ? "+" : ""}{fmt(profit)} lei
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Warning if high breakeven */}
                {result.breakEvenRoas !== null && result.breakEvenRoas > 4 && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-300/80">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      Breakeven ROAS de <strong className="text-amber-300">{fmt(result.breakEvenRoas)}x</strong> este ridicat.
                      Verifică dacă costul produsului sau al curierului poate fi optimizat.
                    </span>
                  </div>
                )}

                {result.breakEvenRoas === null && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-300/80">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>
                      Marja netă este negativă — costurile depășesc venitul chiar și fără reclame.
                      Verifică prețul de vânzare și costurile.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
