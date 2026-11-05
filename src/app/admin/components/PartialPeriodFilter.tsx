"use client";

import { PARTIAL_PERIODS, type PartialPeriod } from "@/lib/partial-period";

export default function PartialPeriodFilter({ value, onChange }: { value: PartialPeriod; onChange: (value: PartialPeriod) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {PARTIAL_PERIODS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
            value === opt.value
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
