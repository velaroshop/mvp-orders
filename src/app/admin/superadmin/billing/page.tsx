"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatMoney } from "@/lib/billing";

interface OrgRow {
  id: string;
  name: string;
  isActive: boolean;
  isPending: boolean;
  invoicePlan: string;
  hasBilling: boolean;
  billingEnabled: boolean;
  paused: boolean;
  freeUntil: string | null;
  currency: string;
  price: number | null;
  discountPercent: number;
  nextInvoiceDate: string | null;
  lastInvoice: { series: string | null; number: string | null; amount: number; currency: string; issuedAt: string; status: string } | null;
  paymentState: "overdue" | "due_soon" | "ok" | "none";
  overdueDays: number;
  daysToDue: number | null;
  outstanding: number;
}

interface Summary {
  overdueCount: number;
  overdueSum: number;
  outstandingSum: number;
  paidThisMonth: number;
  recurring: number;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const isSuperadmin =
    (session?.user as any)?.activeRole === "owner" && (session?.user as any)?.isSuperadminOrg === true;

  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperadmin) router.replace("/admin/orders");
  }, [status, isSuperadmin, router]);

  useEffect(() => {
    if (!isSuperadmin) return;
    (async () => {
      try {
        const res = await fetch("/api/superadmin/billing");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Eroare la încărcare");
        setNeedsMigration(!!json.needsMigration);
        setOrganizations(json.organizations || []);
        setSummary(json.summary || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare la încărcare");
      } finally {
        setLoading(false);
      }
    })();
  }, [isSuperadmin]);

  if (!isSuperadmin) return null;

  const rows = onlyOverdue ? organizations.filter((o) => o.paymentState === "overdue") : organizations;

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="page-title">Billing</h1>
        <p className="page-subtitle">Abonamentele organizațiilor, facturile emise și încasările.</p>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {needsMigration && (
        <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Tabelele de facturare nu există încă. Rulează migrarea 110 în Supabase, apoi reîncarcă pagina.
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className={`card p-4 ${summary.overdueCount > 0 ? "border-red-500/60" : ""}`}>
            <p className="label">Restante</p>
            <p className={`text-xl font-semibold ${summary.overdueCount > 0 ? "text-red-400" : "text-white"}`}>{summary.overdueCount}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{formatMoney(summary.overdueSum)}</p>
          </div>
          <div className="card p-4">
            <p className="label">De încasat</p>
            <p className="text-xl font-semibold text-white">{formatMoney(summary.outstandingSum)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">facturi emise, neachitate</p>
          </div>
          <div className="card p-4">
            <p className="label">Încasat luna aceasta</p>
            <p className="text-xl font-semibold text-emerald-400">{formatMoney(summary.paidThisMonth)}</p>
          </div>
          <div className="card p-4">
            <p className="label">Venit lunar recurent</p>
            <p className="text-xl font-semibold text-white">{formatMoney(summary.recurring)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">organizații cu facturare activă</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-400">{rows.length} {rows.length === 1 ? "organizație" : "organizații"}</p>
        <button
          type="button"
          onClick={() => setOnlyOverdue((v) => !v)}
          aria-pressed={onlyOverdue}
          className={`btn btn-sm ${onlyOverdue ? "btn-danger" : "btn-secondary"}`}
        >
          Doar restante
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-700/60">
              <th className="px-4 py-3 font-medium">Organizație</th>
              <th className="px-3 py-3 font-medium">Plan</th>
              <th className="px-3 py-3 font-medium">Preț / lună</th>
              <th className="px-3 py-3 font-medium">Facturare</th>
              <th className="px-3 py-3 font-medium">Următoarea factură</th>
              <th className="px-3 py-3 font-medium">Ultima factură</th>
              <th className="px-3 py-3 font-medium">Plată</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/40">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">Se încarcă...</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  {onlyOverdue ? "Nu există facturi restante." : "Nu există organizații."}
                </td>
              </tr>
            )}
            {rows.map((org) => (
              <tr
                key={org.id}
                className="hover:bg-zinc-800/60 cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/superadmin/billing/${org.id}`)}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/superadmin/billing/${org.id}`}
                    className="font-medium text-white hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {org.name}
                  </Link>
                  {org.isPending && <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">NOU</span>}
                  {!org.isPending && !org.isActive && <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">SUSPENDAT</span>}
                </td>
                <td className="px-3 py-3 text-zinc-300">{org.hasBilling ? org.invoicePlan.toUpperCase() : "—"}</td>
                <td className="px-3 py-3 text-zinc-300 whitespace-nowrap">
                  {org.price != null ? formatMoney(org.price, org.currency) : "—"}
                  {org.discountPercent > 0 && <span className="ml-1 text-xs text-zinc-400">(−{org.discountPercent}%)</span>}
                </td>
                <td className="px-3 py-3">
                  {!org.billingEnabled ? (
                    <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">Oprită</span>
                  ) : org.paused ? (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">În pauză</span>
                  ) : org.freeUntil && org.nextInvoiceDate && org.freeUntil >= new Date().toISOString().slice(0, 10) ? (
                    <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">Gratuit până {fmtDate(org.freeUntil)}</span>
                  ) : (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">Activă</span>
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-300 whitespace-nowrap">{org.nextInvoiceDate ? fmtDate(org.nextInvoiceDate) : "—"}</td>
                <td className="px-3 py-3 text-zinc-300">
                  {org.lastInvoice ? (
                    <>
                      <span className="whitespace-nowrap">{`${org.lastInvoice.series || ""}${org.lastInvoice.number || ""}` || "factură"}</span>
                      <span className="block text-xs text-zinc-400">
                        {formatMoney(org.lastInvoice.amount, org.lastInvoice.currency)} · {fmtDate(org.lastInvoice.issuedAt)}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {org.paymentState === "overdue" && (
                    <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                      Restantă {org.overdueDays} {org.overdueDays === 1 ? "zi" : "zile"}
                    </span>
                  )}
                  {org.paymentState === "due_soon" && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                      {org.daysToDue === 0 ? "Scadentă azi" : `Scadentă în ${org.daysToDue} ${org.daysToDue === 1 ? "zi" : "zile"}`}
                    </span>
                  )}
                  {org.paymentState === "ok" && (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                      {org.outstanding > 0 ? "Emisă" : "La zi"}
                    </span>
                  )}
                  {org.paymentState === "none" && <span className="text-zinc-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
