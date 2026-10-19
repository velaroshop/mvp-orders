"use client";

import { useState } from "react";
import { COUNTY_PATHS, COUNTY_NAMES } from "./county-data";
import type { CountyStat } from "@/app/api/admin/returns-map/route";

// Normalize a raw county name from DB to a county ID (ro-ab, ro-b, etc.)
const NORM_TO_ID: Record<string, string> = {
  "alba": "ro-ab",
  "arges": "ro-ag", "argeș": "ro-ag",
  "arad": "ro-ar",
  "bacau": "ro-bc", "bacău": "ro-bc",
  "bihor": "ro-bh",
  "bistrita-nasaud": "ro-bn", "bistrita nasaud": "ro-bn", "bistrita": "ro-bn",
  "bistrița-năsăud": "ro-bn", "bistrița năsăud": "ro-bn", "bistrița": "ro-bn",
  "braila": "ro-br", "brăila": "ro-br",
  "botosani": "ro-bt", "botoșani": "ro-bt",
  "bucuresti": "ro-b", "bucurești": "ro-b", "bucharest": "ro-b",
  "brasov": "ro-bv", "brașov": "ro-bv",
  "buzau": "ro-bz", "buzău": "ro-bz",
  "cluj": "ro-cj", "cluj-napoca": "ro-cj",
  "calarasi": "ro-cl", "călărași": "ro-cl",
  "caras-severin": "ro-cs", "caraș-severin": "ro-cs", "caras severin": "ro-cs",
  "constanta": "ro-ct", "constanța": "ro-ct",
  "covasna": "ro-cv",
  "dambovita": "ro-db", "dâmbovița": "ro-db", "dimboviia": "ro-db",
  "dolj": "ro-dj",
  "gorj": "ro-gj",
  "galati": "ro-gl", "galați": "ro-gl",
  "giurgiu": "ro-gr",
  "hunedoara": "ro-hd",
  "harghita": "ro-hr",
  "ilfov": "ro-if",
  "ialomita": "ro-il", "ialomița": "ro-il",
  "iasi": "ro-is", "iași": "ro-is",
  "mehedinti": "ro-mh", "mehedinți": "ro-mh",
  "maramures": "ro-mm", "maramureș": "ro-mm",
  "mures": "ro-ms", "mureș": "ro-ms",
  "neamt": "ro-nt", "neamț": "ro-nt",
  "olt": "ro-ot",
  "prahova": "ro-ph",
  "sibiu": "ro-sb",
  "salaj": "ro-sj", "sălaj": "ro-sj",
  "satu mare": "ro-sm",
  "suceava": "ro-sv",
  "tulcea": "ro-tl",
  "timis": "ro-tm", "timiș": "ro-tm", "timisoara": "ro-tm",
  "teleorman": "ro-tr",
  "valcea": "ro-vl", "vâlcea": "ro-vl",
  "vrancea": "ro-vn",
  "vaslui": "ro-vs",
};

export function normalizeToId(raw: string): string | null {
  const key = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")   // hyphens → spaces (bistrita-nasaud = bistrita nasaud)
    .replace(/\s+/g, " ");
  return NORM_TO_ID[key] ?? null;
}

interface Props {
  stats: CountyStat[];
  onCountyClick?: (countyId: string, name: string) => void;
}

export default function RomaniaMap({ stats, onCountyClick }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; id: string; name: string; stat: CountyStat | null;
  } | null>(null);

  // Build a map from county SVG id → stat
  const statById = new Map<string, CountyStat>();
  for (const s of stats) {
    const id = normalizeToId(s.county);
    if (id) statById.set(id, s);
  }

  function getColor(id: string): string {
    const s = statById.get(id);
    if (!s) return "#3f3f46"; // no data — zinc-700
    const rate = s.returnRate;
    if (rate === 0) return "#166534";       // green-800 — 0%
    if (rate < 5)  return "#15803d";        // green-700
    if (rate < 10) return "#16a34a";        // green-600
    if (rate < 15) return "#ca8a04";        // yellow-600
    if (rate < 20) return "#d97706";        // amber-600
    if (rate < 25) return "#ea580c";        // orange-600
    if (rate < 35) return "#dc2626";        // red-600
    return "#991b1b";                        // red-800 — >35%
  }

  function handleMouseMove(e: React.MouseEvent<SVGElement>, id: string) {
    const rect = (e.currentTarget as SVGElement)
      .closest("svg")!
      .getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id,
      name: COUNTY_NAMES[id] ?? id,
      stat: statById.get(id) ?? null,
    });
  }

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox="0 0 613 433"
        className="w-full h-auto"
        style={{ maxHeight: 420 }}
      >
        {Object.entries(COUNTY_PATHS).map(([id, d]) => (
          <path
            key={id}
            d={d}
            fill={getColor(id)}
            stroke="#18181b"
            strokeWidth={0.6}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseMove={(e) => handleMouseMove(e, id)}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => {
              if (onCountyClick) onCountyClick(id, COUNTY_NAMES[id] ?? id);
            }}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <p className="font-semibold text-white mb-1">{tooltip.name}</p>
          {tooltip.stat ? (
            <>
              <p className="text-zinc-400">
                Rată retur:{" "}
                <span className={`font-bold ${tooltip.stat.returnRate > 20 ? "text-red-400" : tooltip.stat.returnRate > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  {tooltip.stat.returnRate.toFixed(1)}%
                </span>
              </p>
              <p className="text-zinc-400">{tooltip.stat.returnedOrders} / {tooltip.stat.totalOrders} comenzi</p>
              {tooltip.stat.returnedValue > 0 && (
                <p className="text-zinc-400">
                  {tooltip.stat.returnedValue.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} RON pierdut
                </p>
              )}
            </>
          ) : (
            <p className="text-zinc-500">Date insuficiente</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {[
          { color: "#166534", label: "0%" },
          { color: "#16a34a", label: "5%" },
          { color: "#ca8a04", label: "15%" },
          { color: "#ea580c", label: "25%" },
          { color: "#991b1b", label: "35%+" },
          { color: "#3f3f46", label: "N/A" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
