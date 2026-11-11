"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  addDays,
  daysBetween,
  effectivePrice,
  formatMoney,
  invoiceState,
  nextInvoiceDate,
  PAYMENT_TERM_DAYS,
} from "@/lib/billing";

interface Form {
  company_name: string;
  cui: string;
  is_vat_payer: boolean;
  address: string;
  city: string;
  county: string;
  postal_code: string;
  billing_email: string;
  contact_name: string;
  contact_phone: string;
  invoice_plan: string;
  monthly_price: string;
  discount_percent: string;
  vat_rate: string;
  currency: string;
  billing_enabled: boolean;
  paused: boolean;
  billing_timing: string;
  billing_start_date: string;
  billing_day: string;
  free_until: string;
  notes: string;
}

interface Invoice {
  id: string;
  series: string | null;
  number: string | null;
  period_start: string | null;
  period_end: string | null;
  amount: number;
  currency: string;
  issued_at: string;
  due_date: string;
  status: "issued" | "paid" | "cancelled";
  paid_at: string | null;
  paid_method: string | null;
  source: string;
  note: string | null;
}

interface OrgInfo {
  id: string;
  name: string;
  plan: string;
  isActive: boolean;
  isPending: boolean;
  createdAt: string;
}

const PAY_METHODS = ["Transfer bancar", "Card", "Numerar", "Altă metodă"];

function toForm(b: any): Form {
  const s = (v: unknown) => (v == null ? "" : String(v));
  return {
    company_name: s(b.company_name),
    cui: s(b.cui),
    is_vat_payer: !!b.is_vat_payer,
    address: s(b.address),
    city: s(b.city),
    county: s(b.county),
    postal_code: s(b.postal_code),
    billing_email: s(b.billing_email),
    contact_name: s(b.contact_name),
    contact_phone: s(b.contact_phone),
    invoice_plan: b.invoice_plan || "pro",
    monthly_price: s(b.monthly_price),
    discount_percent: s(b.discount_percent ?? 0),
    vat_rate: s(b.vat_rate ?? 0),
    currency: b.currency || "RON",
    billing_enabled: !!b.billing_enabled,
    paused: !!b.paused,
    billing_timing: b.billing_timing || "end",
    billing_start_date: s(b.billing_start_date),
    billing_day: s(b.billing_day),
    free_until: s(b.free_until),
    notes: s(b.notes),
  };
}

function numOrNull(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function OrgBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [saved, setSaved] = useState(false);
  const [today, setToday] = useState("");
  const [needsMigration, setNeedsMigration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invForm, setInvForm] = useState({ series: "", number: "", period_start: "", period_end: "", amount: "", issued_at: "", due_date: "", note: "" });
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState(PAY_METHODS[0]);

  const isSuperadmin =
    (session?.user as any)?.activeRole === "owner" && (session?.user as any)?.isSuperadminOrg === true;

  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperadmin) router.replace("/admin/orders");
  }, [status, isSuperadmin, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/superadmin/billing/${orgId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Eroare la încărcare");
      if (json.needsMigration) {
        setNeedsMigration(true);
        return;
      }
      setOrg(json.organization);
      setForm(toForm(json.billing));
      setInvoices(json.invoices || []);
      setSaved(!!json.saved);
      setToday(json.today);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Eroare la încărcare" });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (isSuperadmin) load();
  }, [isSuperadmin, load]);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Eroare");
    return json;
  }

  function changed() {
    window.dispatchEvent(new Event("billing:changed"));
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      await call(`/api/superadmin/billing/${orgId}`, "PUT", {
        company_name: form.company_name,
        cui: form.cui,
        is_vat_payer: form.is_vat_payer,
        address: form.address,
        city: form.city,
        county: form.county,
        postal_code: form.postal_code,
        billing_email: form.billing_email,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        invoice_plan: form.invoice_plan,
        monthly_price: numOrNull(form.monthly_price),
        discount_percent: numOrNull(form.discount_percent) ?? 0,
        vat_rate: numOrNull(form.vat_rate) ?? 0,
        currency: form.currency,
        billing_enabled: form.billing_enabled,
        paused: form.paused,
        billing_mode: "manual",
        billing_timing: form.billing_timing,
        billing_start_date: form.billing_start_date || null,
        billing_day: form.billing_day === "" ? null : Number(form.billing_day),
        free_until: form.free_until || null,
        notes: form.notes,
      });
      setMessage({ type: "success", text: "Datele au fost salvate." });
      await load();
      changed();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Eroare la salvare" });
    } finally {
      setSaving(false);
    }
  }

  async function handleLookup() {
    if (!form) return;
    setLookingUp(true);
    setLookupNote(null);
    setMessage(null);
    try {
      const json = await call(`/api/superadmin/anaf?cui=${encodeURIComponent(form.cui)}`, "GET");
      if (!json.found) {
        setMessage({ type: "error", text: "CUI-ul nu a fost găsit la ANAF." });
        return;
      }
      setForm((f) =>
        f
          ? {
              ...f,
              cui: json.cui,
              company_name: json.companyName || f.company_name,
              address: json.address || f.address,
              city: json.city || f.city,
              county: json.county || f.county,
              postal_code: json.postalCode || f.postal_code,
              is_vat_payer: json.isVatPayer,
            }
          : f
      );
      const notes = [
        json.regCom ? `Reg. Com.: ${json.regCom}` : "",
        json.isVatPayer ? "plătitor de TVA" : "neplătitor de TVA",
        json.isInactive ? "ATENȚIE: firma figurează inactivă la ANAF" : "",
      ].filter(Boolean);
      setLookupNote(notes.join(" · "));
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Nu s-au putut prelua datele de la ANAF." });
    } finally {
      setLookingUp(false);
    }
  }

  async function handleAddInvoice() {
    setMessage(null);
    try {
      await call(`/api/superadmin/billing/${orgId}/invoices`, "POST", {
        series: invForm.series,
        number: invForm.number,
        period_start: invForm.period_start || null,
        period_end: invForm.period_end || null,
        amount: numOrNull(invForm.amount),
        issued_at: invForm.issued_at,
        due_date: invForm.due_date || undefined,
        note: invForm.note,
      });
      setShowInvoiceForm(false);
      setInvForm({ series: "", number: "", period_start: "", period_end: "", amount: "", issued_at: "", due_date: "", note: "" });
      setMessage({ type: "success", text: "Factura a fost adăugată." });
      await load();
      changed();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Eroare" });
    }
  }

  async function invoiceAction(id: string, action: "pay" | "unpay" | "cancel", extra?: Record<string, string>) {
    setMessage(null);
    try {
      await call(`/api/superadmin/billing/invoices/${id}`, "PATCH", { action, ...extra });
      setPayingId(null);
      await load();
      changed();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Eroare" });
    }
  }

  async function deleteInvoice(id: string) {
    if (!confirm("Ștergi această înregistrare? Acțiunea nu poate fi anulată.")) return;
    setMessage(null);
    try {
      await call(`/api/superadmin/billing/invoices/${id}`, "DELETE");
      await load();
      changed();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Eroare" });
    }
  }

  if (!isSuperadmin) return null;

  if (needsMigration) {
    return (
      <div className="max-w-5xl">
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Tabelele de facturare nu există încă. Rulează migrarea 110 în Supabase, apoi reîncarcă pagina.
        </div>
      </div>
    );
  }

  if (loading || !form || !org) {
    return <p className="text-zinc-400">{loading ? "Se încarcă..." : "Organizația nu a fost găsită."}</p>;
  }

  const finalPrice = effectivePrice(numOrNull(form.monthly_price), numOrNull(form.discount_percent) ?? 0);
  const next = nextInvoiceDate(
    {
      billing_enabled: form.billing_enabled,
      paused: form.paused,
      billing_start_date: form.billing_start_date || null,
      billing_day: form.billing_day === "" ? null : Number(form.billing_day),
      free_until: form.free_until || null,
    },
    org.createdAt,
    today
  );
  const issuedPreview = invForm.issued_at || today;

  return (
    <div className="max-w-5xl pb-16">
      <Link href="/admin/superadmin/billing" className="text-sm text-emerald-400 hover:text-emerald-300 inline-block mb-3">
        ← Înapoi la Billing
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{org.name}</h1>
          <p className="page-subtitle">
            Organizație din {fmtDate(org.createdAt.slice(0, 10))} · plan platformă {org.plan.toUpperCase()}
            {org.isPending ? " · în așteptarea activării" : !org.isActive ? " · suspendată" : ""}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Se salvează..." : "Salvează"}
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-red-500/50 bg-red-500/10 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {!saved && (
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-300">
          Nu sunt date de facturare salvate pentru această organizație. Denumirea și CUI-ul au fost preluate din înregistrare. Verifică-le și salvează.
        </div>
      )}

      {/* Invoicing data */}
      <section className="card p-5 mb-6">
        <h2 className="section-title mb-4">Date de facturare</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">CUI</label>
            <div className="flex gap-2">
              <input className="input" value={form.cui} onChange={(e) => set("cui", e.target.value)} placeholder="ex: 25011510" />
              <button type="button" className="btn btn-secondary whitespace-nowrap" onClick={handleLookup} disabled={lookingUp || !form.cui.trim()}>
                {lookingUp ? "Se caută..." : "Completează din CUI"}
              </button>
            </div>
            {lookupNote && <p className="text-xs text-zinc-400 mt-1">Date ANAF: {lookupNote}</p>}
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={form.is_vat_payer} onChange={(e) => set("is_vat_payer", e.target.checked)} />
              Firma este plătitoare de TVA (CUI cu prefix RO pe factură)
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="label">Denumire firmă</label>
            <input className="input" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Adresă</label>
            <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Stradă, număr, bloc, apartament" />
          </div>
          <div>
            <label className="label">Localitate</label>
            <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="label">Județ</label>
            <input className="input" value={form.county} onChange={(e) => set("county", e.target.value)} />
          </div>
          <div>
            <label className="label">Cod poștal</label>
            <input className="input" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
          </div>
          <div>
            <label className="label">Email facturare</label>
            <input className="input" value={form.billing_email} onChange={(e) => set("billing_email", e.target.value)} placeholder="mai multe adrese, separate prin virgulă" />
          </div>
          <div>
            <label className="label">Persoană de contact</label>
            <input className="input" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div>
            <label className="label">Telefon contact</label>
            <input className="input" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="card p-5 mb-6">
        <h2 className="section-title mb-4">Abonament</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Plan pe factură</label>
            <select className="input" value={form.invoice_plan} onChange={(e) => set("invoice_plan", e.target.value)}>
              <option value="pro">PRO</option>
              <option value="ultra">ULTRA</option>
            </select>
            <p className="text-xs text-zinc-400 mt-1">Doar informativ, apare pe factură. Nu schimbă funcțiile contului.</p>
          </div>
          <div>
            <label className="label">Preț lunar</label>
            <input className="input" inputMode="decimal" value={form.monthly_price} onChange={(e) => set("monthly_price", e.target.value)} placeholder="ex: 650" />
          </div>
          <div>
            <label className="label">Monedă</label>
            <select className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="label">Reducere (%)</label>
            <input className="input" inputMode="decimal" value={form.discount_percent} onChange={(e) => set("discount_percent", e.target.value)} />
          </div>
          <div>
            <label className="label">TVA (%)</label>
            <input className="input" inputMode="decimal" value={form.vat_rate} onChange={(e) => set("vat_rate", e.target.value)} />
            <p className="text-xs text-zinc-400 mt-1">0 cât timp furnizorul e neplătitor de TVA.</p>
          </div>
          <div>
            <label className="label">Preț final / lună</label>
            <p className="text-lg font-semibold text-white pt-1">{finalPrice != null ? formatMoney(finalPrice, form.currency) : "—"}</p>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="card p-5 mb-6">
        <h2 className="section-title mb-4">Program de facturare</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.billing_enabled} onChange={(e) => set("billing_enabled", e.target.checked)} />
            Facturare pornită
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.paused} onChange={(e) => set("paused", e.target.checked)} />
            Pauză de facturare
          </label>
          <div>
            <label className="label">Mod</label>
            <select className="input" value="manual" onChange={() => undefined}>
              <option value="manual">Manual</option>
              <option value="auto" disabled>Automat (disponibil după integrarea SmartBill)</option>
            </select>
          </div>
          <div>
            <label className="label">Momentul facturării</label>
            <select className="input" value={form.billing_timing} onChange={(e) => set("billing_timing", e.target.value)}>
              <option value="end">La sfârșitul perioadei (postplată)</option>
              <option value="start">La începutul perioadei (în avans)</option>
            </select>
          </div>
          <div>
            <label className="label">Începutul abonamentului</label>
            <input type="date" className="input" value={form.billing_start_date} onChange={(e) => set("billing_start_date", e.target.value)} />
            <p className="text-xs text-zinc-400 mt-1">Gol = data înregistrării organizației ({fmtDate(org.createdAt.slice(0, 10))}).</p>
          </div>
          <div>
            <label className="label">Ziua facturării</label>
            <select className="input" value={form.billing_day} onChange={(e) => set("billing_day", e.target.value)}>
              <option value="">Automat (ziua dinaintea începutului)</option>
              <option value="0">Ultima zi a lunii</option>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>
                  {d} ale lunii
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Gratuit până la</label>
            <input type="date" className="input" value={form.free_until} onChange={(e) => set("free_until", e.target.value)} />
            <p className="text-xs text-zinc-400 mt-1">Nu se facturează nimic până la această dată.</p>
          </div>
          <div>
            <label className="label">Următoarea factură</label>
            <p className="text-lg font-semibold text-white pt-1">
              {next ? fmtDate(next) : "—"}
            </p>
            {!next && <p className="text-xs text-zinc-400">Facturarea este oprită sau în pauză.</p>}
          </div>
          <div className="md:col-span-2">
            <label className="label">Notițe interne</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-4">
          Pentru a porni facturarea trebuie completate denumirea, CUI-ul, adresa, email-ul de facturare și prețul lunar. Nicio factură nu se emite automat în această etapă.
        </p>
      </section>

      <div className="flex justify-end mb-8">
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Se salvează..." : "Salvează"}
        </button>
      </div>

      {/* Invoices */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Facturi</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setShowInvoiceForm((v) => !v);
              setInvForm((f) => ({ ...f, amount: f.amount || (finalPrice != null ? String(finalPrice) : ""), issued_at: f.issued_at || today }));
            }}
          >
            {showInvoiceForm ? "Închide" : "Adaugă factură"}
          </button>
        </div>

        {showInvoiceForm && (
          <div className="mb-5 rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-400 mb-3">
              Înregistrează o factură emisă deja în SmartBill. Scadența implicită este emiterea plus {PAYMENT_TERM_DAYS} zile.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="label">Serie</label>
                <input className="input" value={invForm.series} onChange={(e) => setInvForm({ ...invForm, series: e.target.value })} />
              </div>
              <div>
                <label className="label">Număr</label>
                <input className="input" value={invForm.number} onChange={(e) => setInvForm({ ...invForm, number: e.target.value })} />
              </div>
              <div>
                <label className="label">Perioadă de la</label>
                <input type="date" className="input" value={invForm.period_start} onChange={(e) => setInvForm({ ...invForm, period_start: e.target.value })} />
              </div>
              <div>
                <label className="label">Perioadă până la</label>
                <input type="date" className="input" value={invForm.period_end} onChange={(e) => setInvForm({ ...invForm, period_end: e.target.value })} />
              </div>
              <div>
                <label className="label">Sumă ({form.currency})</label>
                <input className="input" inputMode="decimal" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Emisă la</label>
                <input type="date" className="input" value={invForm.issued_at} onChange={(e) => setInvForm({ ...invForm, issued_at: e.target.value })} />
              </div>
              <div>
                <label className="label">Scadență</label>
                <input
                  type="date"
                  className="input"
                  value={invForm.due_date || (issuedPreview ? addDays(issuedPreview, PAYMENT_TERM_DAYS) : "")}
                  onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Notă</label>
                <input className="input" value={invForm.note} onChange={(e) => setInvForm({ ...invForm, note: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddInvoice}>
                Salvează factura
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-700/60">
                <th className="py-2 pr-3 font-medium">Factură</th>
                <th className="py-2 pr-3 font-medium">Perioadă</th>
                <th className="py-2 pr-3 font-medium">Sumă</th>
                <th className="py-2 pr-3 font-medium">Emisă</th>
                <th className="py-2 pr-3 font-medium">Scadență</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/40">
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-400">Nu există facturi.</td>
                </tr>
              )}
              {invoices.map((inv) => {
                const state = invoiceState(inv, today);
                const daysLeft = daysBetween(today, inv.due_date);
                return (
                  <tr key={inv.id} className={inv.status === "cancelled" ? "opacity-60" : ""}>
                    <td className="py-2.5 pr-3 text-zinc-200 whitespace-nowrap">
                      {`${inv.series || ""}${inv.number || ""}` || "—"}
                      {inv.note && <span className="block text-xs text-zinc-400">{inv.note}</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-300 whitespace-nowrap">
                      {inv.period_start && inv.period_end ? `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}` : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-200 whitespace-nowrap">{formatMoney(inv.amount, inv.currency)}</td>
                    <td className="py-2.5 pr-3 text-zinc-300 whitespace-nowrap">{fmtDate(inv.issued_at)}</td>
                    <td className="py-2.5 pr-3 text-zinc-300 whitespace-nowrap">{fmtDate(inv.due_date)}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {state === "paid" && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                          Achitată{inv.paid_at ? ` ${fmtDate(inv.paid_at)}` : ""}
                          {inv.paid_method ? ` · ${inv.paid_method}` : ""}
                        </span>
                      )}
                      {state === "cancelled" && <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">Anulată</span>}
                      {state === "overdue" && (
                        <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Restantă {-daysLeft} {-daysLeft === 1 ? "zi" : "zile"}
                        </span>
                      )}
                      {state === "due_soon" && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          {daysLeft === 0 ? "Scadentă azi" : `Scadentă în ${daysLeft} ${daysLeft === 1 ? "zi" : "zile"}`}
                        </span>
                      )}
                      {state === "open" && <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">Emisă</span>}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {inv.status === "issued" && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm mr-1"
                          onClick={() => {
                            setPayingId(payingId === inv.id ? null : inv.id);
                            setPayDate(today);
                            setPayMethod(PAY_METHODS[0]);
                          }}
                        >
                          Marchează achitată
                        </button>
                      )}
                      {inv.status === "paid" && (
                        <button type="button" className="btn btn-secondary btn-sm mr-1" onClick={() => invoiceAction(inv.id, "unpay")}>
                          Neachitată
                        </button>
                      )}
                      {inv.status === "issued" && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm mr-1"
                          onClick={() => confirm("Anulezi această factură?") && invoiceAction(inv.id, "cancel")}
                        >
                          Anulează
                        </button>
                      )}
                      {inv.source === "manual" && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteInvoice(inv.id)}>
                          Șterge
                        </button>
                      )}
                      {payingId === inv.id && (
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                          <input type="date" className="input !w-40" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                          <select className="input !w-44" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                            {PAY_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => invoiceAction(inv.id, "pay", { paid_at: payDate, paid_method: payMethod })}>
                            Confirmă
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
