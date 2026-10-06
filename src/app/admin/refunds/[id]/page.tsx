"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface RefundRequest {
  id: string;
  ticket_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  order_number: string | null;
  product_name: string;
  motive: string;
  description: string | null;
  status: "new" | "in_progress" | "completed";
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

function statusBadgeClass(status: RefundRequest["status"]) {
  return {
    new:         "badge badge-red",
    in_progress: "badge badge-orange",
    completed:   "badge badge-green",
  }[status];
}

function statusLabel(status: RefundRequest["status"]) {
  return { new: "Nou", in_progress: "În lucru", completed: "Finalizat" }[status];
}

export default function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [refund, setRefund] = useState<RefundRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { loadRefund(); }, [id]);

  async function loadRefund() {
    try {
      const res = await fetch(`/api/refunds/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setRefund(data.refund);
      setAdminNotes(data.refund.admin_notes || "");
    } catch (error) {
      console.error("Error loading refund:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/refunds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRefund(data.refund);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setNotesMessage(null);
    try {
      const res = await fetch(`/api/refunds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRefund(data.refund);
      setNotesMessage({ type: "success", text: "Notele au fost salvate." });
    } catch (error) {
      console.error("Error saving notes:", error);
      setNotesMessage({ type: "error", text: "Eroare la salvarea notelor." });
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted text-sm">Se încarcă...</p>
      </div>
    );
  }

  if (!refund) {
    return (
      <div className="card p-10 text-center">
        <p className="text-muted mb-4">Cererea de returnare nu a fost găsită.</p>
        <Link href="/admin/refunds" className="btn btn-secondary">
          Înapoi la listă
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href="/admin/refunds" className="text-xs text-faint hover:text-white transition-colors mb-2 inline-block">
          ← Înapoi la returnări
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="page-title font-mono">{refund.ticket_number}</h1>
          <span className={statusBadgeClass(refund.status)}>{statusLabel(refund.status)}</span>
        </div>
        <p className="page-subtitle">
          Creat pe {new Date(refund.created_at).toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Status actions */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted">Schimbă status:</span>
          {refund.status === "new" && (
            <button onClick={() => updateStatus("in_progress")} className="btn btn-secondary">
              Marchează &quot;În lucru&quot;
            </button>
          )}
          {refund.status === "in_progress" && (
            <>
              <button onClick={() => updateStatus("completed")} className="btn btn-primary">
                Marchează &quot;Finalizat&quot;
              </button>
              <button onClick={() => updateStatus("new")} className="btn btn-secondary">
                Înapoi la Nou
              </button>
            </>
          )}
          {refund.status === "completed" && (
            <button onClick={() => updateStatus("in_progress")} className="btn btn-secondary">
              Redeschide
            </button>
          )}
        </div>
        {refund.resolved_at && (
          <p className="text-xs text-faint mt-2">
            Rezolvat la {new Date(refund.resolved_at).toLocaleDateString("ro-RO", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Client info + Refund details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5 space-y-3">
          <h2 className="section-title">Date client</h2>
          <div>
            <p className="text-xs text-faint uppercase tracking-wide mb-0.5">Nume</p>
            <p className="text-white text-sm">{refund.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-faint uppercase tracking-wide mb-0.5">Email</p>
            <a href={`mailto:${refund.email}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
              {refund.email}
            </a>
          </div>
          {refund.phone && (
            <div>
              <p className="text-xs text-faint uppercase tracking-wide mb-0.5">Telefon</p>
              <a href={`tel:${refund.phone}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
                {refund.phone}
              </a>
            </div>
          )}
          {refund.order_number && (
            <div>
              <p className="text-xs text-faint uppercase tracking-wide mb-0.5">Nr. comandă</p>
              <p className="text-white text-sm">{refund.order_number}</p>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="section-title">Detalii returnare</h2>
          <div>
            <p className="text-xs text-faint uppercase tracking-wide mb-0.5">Produs</p>
            <p className="text-white text-sm">{refund.product_name}</p>
          </div>
          <div>
            <p className="text-xs text-faint uppercase tracking-wide mb-0.5">Motiv</p>
            <p className="text-white text-sm">{refund.motive}</p>
          </div>
          {refund.description && (
            <div>
              <p className="text-xs text-faint uppercase tracking-wide mb-0.5">Descriere</p>
              <p className="text-muted text-sm whitespace-pre-wrap">{refund.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin notes */}
      <div className="card p-5 space-y-3">
        <h2 className="section-title">Note interne</h2>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={4}
          className="input w-full resize-none"
          placeholder="Adaugă note interne..."
        />
        {notesMessage && (
          <div className={`card p-3 text-sm ${
            notesMessage.type === "success"
              ? "border-green-700/60 text-green-400"
              : "border-red-800/60 text-red-400"
          }`}>
            {notesMessage.text}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={saveNotes} disabled={savingNotes} className="btn btn-primary">
            {savingNotes ? "Se salvează..." : "Salvează notele"}
          </button>
        </div>
      </div>

      {/* Meta info */}
      <p className="text-xs text-faint">
        IP: {refund.ip_address || "N/A"} · Ultima actualizare: {new Date(refund.updated_at).toLocaleString("ro-RO")}
      </p>
    </div>
  );
}
