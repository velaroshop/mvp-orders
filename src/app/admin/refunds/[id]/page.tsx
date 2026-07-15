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

const STATUS_CONFIG = {
  new: { label: "Nou", bg: "bg-red-900/30", text: "text-red-300", border: "border-red-700" },
  in_progress: { label: "In lucru", bg: "bg-amber-900/30", text: "text-amber-300", border: "border-amber-700" },
  completed: { label: "Finalizat", bg: "bg-emerald-900/30", text: "text-emerald-300", border: "border-emerald-700" },
};

export default function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [refund, setRefund] = useState<RefundRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadRefund();
  }, [id]);

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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!refund) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">Cererea de returnare nu a fost gasita.</p>
        <Link href="/admin/refunds" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
          Inapoi la lista
        </Link>
      </div>
    );
  }

  const sc = STATUS_CONFIG[refund.status];

  return (
    <div className="max-w-4xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/admin/refunds" className="text-zinc-400 hover:text-white text-sm mb-2 inline-block">
          &larr; Inapoi la lista
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white font-mono">{refund.ticket_number}</h1>
          <span className={`inline-flex px-2.5 py-1 rounded text-xs border ${sc.bg} ${sc.text} ${sc.border}`}>
            {sc.label}
          </span>
        </div>
        <p className="text-zinc-400 text-sm mt-1">
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
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Schimba status:</span>
          {refund.status === "new" && (
            <button
              onClick={() => updateStatus("in_progress")}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Marcheaza &quot;In lucru&quot;
            </button>
          )}
          {refund.status === "in_progress" && (
            <>
              <button
                onClick={() => updateStatus("completed")}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Marcheaza &quot;Finalizat&quot;
              </button>
              <button
                onClick={() => updateStatus("new")}
                className="px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded-md text-sm hover:bg-zinc-600 transition-colors"
              >
                Inapoi la Nou
              </button>
            </>
          )}
          {refund.status === "completed" && (
            <button
              onClick={() => updateStatus("in_progress")}
              className="px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded-md text-sm hover:bg-zinc-600 transition-colors"
            >
              Redeschide
            </button>
          )}
        </div>
        {refund.resolved_at && (
          <p className="text-xs text-zinc-500 mt-2">
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

      {/* Client info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Date client</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Nume</span>
              <p className="text-white">{refund.full_name}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Email</span>
              <p>
                <a href={`mailto:${refund.email}`} className="text-emerald-400 hover:text-emerald-300">
                  {refund.email}
                </a>
              </p>
            </div>
            {refund.phone && (
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Telefon</span>
                <p>
                  <a href={`tel:${refund.phone}`} className="text-emerald-400 hover:text-emerald-300">
                    {refund.phone}
                  </a>
                </p>
              </div>
            )}
            {refund.order_number && (
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Nr. comanda</span>
                <p className="text-white">{refund.order_number}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Detalii returnare</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Produs</span>
              <p className="text-white">{refund.product_name}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Motiv</span>
              <p className="text-white">{refund.motive}</p>
            </div>
            {refund.description && (
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Descriere</span>
                <p className="text-zinc-300 whitespace-pre-wrap">{refund.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin notes */}
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Note interne</h2>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
          placeholder="Adauga note interne (vizibile doar pentru admin)..."
        />
        {notesMessage && (
          <div className={`mb-3 p-2 rounded text-sm ${
            notesMessage.type === "success"
              ? "bg-emerald-900/20 border border-emerald-700 text-emerald-300"
              : "bg-red-900/20 border border-red-700 text-red-300"
          }`}>
            {notesMessage.text}
          </div>
        )}
        <button
          onClick={saveNotes}
          disabled={savingNotes}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {savingNotes ? "Se salveaza..." : "Salveaza notele"}
        </button>
      </div>

      {/* Meta info */}
      <div className="mt-4 text-xs text-zinc-600">
        IP: {refund.ip_address || "N/A"} | Ultima actualizare: {new Date(refund.updated_at).toLocaleString("ro-RO")}
      </div>
    </div>
  );
}
