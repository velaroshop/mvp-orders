"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku?: string;
  status: "active" | "testing" | "inactive";
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [formData, setFormData] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) fetchProduct();
  }, [productId]);

  async function fetchProduct() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Eroare la încărcarea produsului");
      const data = await res.json();
      const product = data.products?.find((p: Product) => p.id === productId);
      if (!product) throw new Error("Produsul nu a fost găsit");
      setFormData(product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcarea produsului");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, sku: formData.sku, status: formData.status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la salvarea produsului");

      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la salvarea produsului");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-xl">
        <div className="card p-8 text-center">
          <p className="text-faint text-sm">Se încarcă produsul...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-xl">
        <div className="rounded-xl border border-red-800/60 bg-red-900/20 p-4">
          <p className="text-red-400 text-sm">{error || "Produsul nu a fost găsit."}</p>
          <Link href="/admin/products" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
            ← Înapoi la produse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">

      {/* Header */}
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Înapoi la produse
        </Link>
        <h1 className="page-title">Editează produsul</h1>
        <p className="page-subtitle text-zinc-500 font-mono text-xs mt-1">{formData.sku}</p>
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
              value={formData.sku || ""}
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
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "testing" | "inactive" })}
              className="input max-w-xs"
              required
            >
              <option value="active">Activ — produs live, sincronizat cu Helpship</option>
              <option value="testing">Test — comenzile nu se sincronizează</option>
              <option value="inactive">Inactiv — dezactivat</option>
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
            <Link href="/admin/products" className="btn btn-secondary">
              Anulează
            </Link>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
