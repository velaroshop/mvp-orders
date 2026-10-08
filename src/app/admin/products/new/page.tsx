"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    status: "active" as "active" | "testing",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la crearea produsului");

      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la crearea produsului");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">

      {/* Header */}
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Înapoi la produse
        </Link>
        <h1 className="page-title">Produs nou</h1>
        <p className="page-subtitle">Adaugă un produs în catalogul tău</p>
      </div>

      {/* Form card */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Nume */}
          <div>
            <label className="label">Nume *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="ex. Ruj mat rezistent"
              maxLength={50}
              required
            />
            <p className="text-faint text-xs mt-1">Maxim 50 de caractere.</p>
          </div>

          {/* SKU */}
          <div>
            <label className="label">SKU *</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              className="input max-w-xs font-mono"
              placeholder="ex. RUJ-001"
              maxLength={10}
              required
            />
            <p className="text-faint text-xs mt-1">Identificator unic, convertit automat la majuscule. Maxim 10 caractere.</p>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "testing" })}
              className="input max-w-xs"
              required
            >
              <option value="active">Activ — produs live, sincronizat cu Helpship</option>
              <option value="testing">Test — comenzile nu se sincronizează</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-800/60 bg-red-900/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <button type="button" onClick={() => router.back()} className="btn btn-secondary">
              Anulează
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving ? "Se creează..." : "Creează produsul"}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
