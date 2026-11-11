"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatMoney } from "@/lib/billing";

interface AdminAlert {
  overdueCount: number;
  items: { organizationId: string; organizationName: string; invoice: string; amount: number; currency: string; daysLate: number }[];
}

interface OwnerAlert {
  invoice: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysLeft: number;
  overdue: boolean;
}

const DISMISS_KEY = "billing-banner-dismissed";

function dayKey(owner: OwnerAlert): string {
  return `${new Date().toISOString().slice(0, 10)}|${owner.invoice}`;
}

/**
 * Red bar for the superadmin when invoices are past their due date, and a reminder for the owner of an
 * organization before and after the due date of its invoice. Notification only: nothing is blocked.
 */
export default function BillingBanner() {
  const { data: session } = useSession();
  const [admin, setAdmin] = useState<AdminAlert | null>(null);
  const [owner, setOwner] = useState<OwnerAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(() => {
    fetch("/api/billing/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAdmin(data?.admin || null);
        setOwner(data?.owner || null);
        try {
          setDismissed(!!data?.owner && !data.owner.overdue && localStorage.getItem(DISMISS_KEY) === dayKey(data.owner));
        } catch {
          setDismissed(false);
        }
      })
      .catch(() => {
        setAdmin(null);
        setOwner(null);
      });
  }, []);

  const userRole = (session?.user as any)?.activeRole;
  const orgId = (session?.user as any)?.activeOrganizationId;

  useEffect(() => {
    if (userRole !== "owner") return;
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    window.addEventListener("billing:changed", load);
    return () => {
      clearInterval(interval);
      window.removeEventListener("billing:changed", load);
    };
  }, [userRole, orgId, load]);

  if (userRole !== "owner") return null;

  if (admin) {
    return (
      <div className="mb-4 rounded-lg border border-red-500 bg-red-700 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            ⚠ {admin.overdueCount} {admin.overdueCount === 1 ? "factură a depășit" : "facturi au depășit"} termenul de plată
          </p>
          <Link href="/admin/superadmin/billing" className="text-sm font-semibold underline">
            Deschide Billing →
          </Link>
        </div>
        <ul className="mt-1 space-y-0.5 text-xs text-red-100">
          {admin.items.map((item, i) => (
            <li key={`${item.organizationId}-${i}`}>
              <Link href={`/admin/superadmin/billing/${item.organizationId}`} className="underline">
                {item.organizationName}
              </Link>
              {" · "}
              {item.invoice || "factură"} · {formatMoney(item.amount, item.currency)} · {item.daysLate} {item.daysLate === 1 ? "zi" : "zile"} întârziere
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (owner && !dismissed) {
    const when =
      owner.daysLeft < 0
        ? `a depășit scadența cu ${-owner.daysLeft} ${-owner.daysLeft === 1 ? "zi" : "zile"}`
        : owner.daysLeft === 0
        ? "are scadența astăzi"
        : `are scadența în ${owner.daysLeft} ${owner.daysLeft === 1 ? "zi" : "zile"}`;
    const dueText = new Date(`${owner.dueDate}T12:00:00`).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });

    return (
      <div
        className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
          owner.overdue ? "border-red-500 bg-red-700 text-white" : "border-amber-500/50 bg-amber-500/15 text-amber-100"
        }`}
      >
        <p className="text-sm">
          <span className="font-semibold">{owner.overdue ? "Factură restantă. " : "Factură de plătit. "}</span>
          Factura {owner.invoice ? `${owner.invoice} ` : ""}în valoare de {formatMoney(owner.amount, owner.currency)} {when} ({dueText}).
          {owner.overdue ? " Te rugăm să o achiți cât mai curând." : ""}
        </p>
        {!owner.overdue && (
          <button
            type="button"
            className="shrink-0 text-xs underline"
            onClick={() => {
              try {
                localStorage.setItem(DISMISS_KEY, dayKey(owner));
              } catch {
                /* ignore */
              }
              setDismissed(true);
            }}
          >
            Închide pe azi
          </button>
        )}
      </div>
    );
  }

  return null;
}
