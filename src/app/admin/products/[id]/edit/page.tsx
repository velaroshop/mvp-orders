"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Palette } from "lucide-react";

interface Variation {
  id: string;
  name: string;
  sku: string;
  status: "active" | "testing" | "inactive";
  in_stock: boolean;
  variation_visual_type: "image" | "color" | null;
  variation_visual_value: string | null;
  variation_display_order: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  status: "active" | "testing" | "inactive";
  variations?: Variation[];
  variations_label?: string | null;
}

interface NewVariationForm {
  name: string;
  sku: string;
  status: "active" | "inactive";
  in_stock: boolean;
  variation_visual_type: "image" | "color";
  variation_visual_value: string;
}

const defaultNewVariation = (): NewVariationForm => ({
  name: "",
  sku: "",
  status: "active",
  in_stock: true,
  variation_visual_type: "image",
  variation_visual_value: "",
});

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [formData, setFormData] = useState<Product | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New variation form
  const [showAddVariation, setShowAddVariation] = useState(false);
  const [newVariation, setNewVariation] = useState<NewVariationForm>(defaultNewVariation());
  const [isSavingVariation, setIsSavingVariation] = useState(false);
  const [variationError, setVariationError] = useState<string | null>(null);

  // Inline edit for existing variations
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
  const [editingVariationData, setEditingVariationData] = useState<Partial<Variation>>({});
  const [isSavingEditVariation, setIsSavingEditVariation] = useState(false);
  const [editVariationError, setEditVariationError] = useState<string | null>(null);

  // Delete variation
  const [deletingVariationId, setDeletingVariationId] = useState<string | null>(null);
  const [confirmDeleteVariationId, setConfirmDeleteVariationId] = useState<string | null>(null);

  // Variations label (product-level default)
  const [variationsLabel, setVariationsLabel] = useState<string>("");
  const [isSavingLabel, setIsSavingLabel] = useState(false);

  useEffect(() => {
    if (productId) fetchProduct();
  }, [productId]);

  async function fetchProduct() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Eroare la încărcarea produsului");
      const data = await res.json();
      if (!data.product) throw new Error("Produsul nu a fost găsit");
      setFormData(data.product);
      setVariations(data.product.variations || []);
      setVariationsLabel(data.product.variations_label || "");
      // Pre-fill new variation SKU prefix
      setNewVariation(v => ({ ...v, sku: (data.product.sku || "") + "-" }));
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

  async function handleAddVariation() {
    if (!formData) return;
    setIsSavingVariation(true);
    setVariationError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVariation.name,
          sku: newVariation.sku,
          status: newVariation.status,
          parent_product_id: productId,
          variation_visual_type: newVariation.variation_visual_type,
          variation_visual_value: newVariation.variation_visual_value || null,
          variation_display_order: variations.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la adăugarea variației");
      setVariations(v => [...v, { ...data.product, in_stock: true }]);
      setNewVariation({ ...defaultNewVariation(), sku: (formData.sku || "") + "-" });
      setShowAddVariation(false);
    } catch (err) {
      setVariationError(err instanceof Error ? err.message : "Eroare la adăugarea variației");
    } finally {
      setIsSavingVariation(false);
    }
  }

  async function handleSaveVariation(variationId: string) {
    setIsSavingEditVariation(true);
    setEditVariationError(null);
    try {
      const res = await fetch(`/api/products/${variationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingVariationData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la salvarea variației");
      setVariations(v => v.map(variation =>
        variation.id === variationId ? { ...variation, ...editingVariationData } : variation
      ));
      setEditingVariationId(null);
      setEditingVariationData({});
    } catch (err) {
      setEditVariationError(err instanceof Error ? err.message : "Eroare la salvarea variației");
    } finally {
      setIsSavingEditVariation(false);
    }
  }

  async function handleDeleteVariation(variationId: string) {
    setDeletingVariationId(variationId);
    try {
      const res = await fetch(`/api/products/${variationId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Eroare la ștergerea variației");
      }
      setVariations(v => v.filter(variation => variation.id !== variationId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Eroare la ștergerea variației");
    } finally {
      setDeletingVariationId(null);
    }
  }

  async function handleToggleInStock(variation: Variation) {
    try {
      const res = await fetch(`/api/products/${variation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_stock: !variation.in_stock }),
      });
      if (!res.ok) throw new Error("Eroare");
      setVariations(v => v.map(vr =>
        vr.id === variation.id ? { ...vr, in_stock: !vr.in_stock } : vr
      ));
    } catch {
      alert("Eroare la actualizarea stocului");
    }
  }

  async function handleSaveVariationsLabel(value: string) {
    setIsSavingLabel(true);
    try {
      await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variationsLabel: value }),
      });
    } catch {
      // Non-critical: silent fail
    } finally {
      setIsSavingLabel(false);
    }
  }

  function isValidColorHex(value: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  function skuNeedsWarning(sku: string): boolean {
    if (!sku || sku.endsWith("-")) return false;
    return !/^[A-Za-z]+-\d+-[A-Za-z]+$/.test(sku);
  }

  async function handleToggleVariationStatus(variation: Variation) {
    const newStatus = variation.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/products/${variation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Eroare");
      setVariations(v => v.map(vr =>
        vr.id === variation.id ? { ...vr, status: newStatus } : vr
      ));
    } catch {
      alert("Eroare la actualizarea statusului");
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
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Înapoi la produse
        </Link>
        <h1 className="page-title">Editează produsul</h1>
        <p className="page-subtitle text-zinc-500 font-mono text-xs mt-1">{formData.sku}</p>
      </div>

      {/* Main product form */}
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

      {/* Variations section */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div>
            <h2 className="text-sm font-semibold text-white">Variații produs</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Culori, mărimi sau modele. Fiecare variație are SKU propriu în Helpship.</p>
          </div>
          {variations.length < 6 && (
            <button
              type="button"
              onClick={() => { setShowAddVariation(true); setVariationError(null); }}
              className="btn btn-sm btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              Adaugă variație
            </button>
          )}
        </div>

        {/* Existing variations */}
        {variations.length === 0 && !showAddVariation ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-zinc-500">Nicio variație adăugată.</p>
            <p className="text-xs text-zinc-600 mt-1">Apasă „Adaugă variație" pentru a adăuga culori, mărimi sau modele.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {variations.map((variation) => (
              <div key={variation.id} className="px-5 py-3.5">
                {editingVariationId === variation.id ? (
                  /* Inline edit form */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Nume</label>
                        <input
                          type="text"
                          value={editingVariationData.name ?? variation.name}
                          onChange={(e) => setEditingVariationData(d => ({ ...d, name: e.target.value }))}
                          className="input"
                          maxLength={50}
                        />
                      </div>
                      <div>
                        <label className="label">SKU</label>
                        <input
                          type="text"
                          value={editingVariationData.sku ?? variation.sku}
                          onChange={(e) => setEditingVariationData(d => ({ ...d, sku: e.target.value.toUpperCase() }))}
                          className="input font-mono"
                          maxLength={30}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Vizual</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingVariationData(d => ({ ...d, variation_visual_type: "image", variation_visual_value: "" }))}
                            className={`btn btn-sm gap-1.5 ${(editingVariationData.variation_visual_type ?? variation.variation_visual_type) === "image" ? "btn-primary" : "btn-secondary"}`}
                          >
                            <ImageIcon className="w-3 h-3" /> Imagine
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingVariationData(d => ({ ...d, variation_visual_type: "color", variation_visual_value: "" }))}
                            className={`btn btn-sm gap-1.5 ${(editingVariationData.variation_visual_type ?? variation.variation_visual_type) === "color" ? "btn-primary" : "btn-secondary"}`}
                          >
                            <Palette className="w-3 h-3" /> Culoare
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="label">
                          {(editingVariationData.variation_visual_type ?? variation.variation_visual_type) === "color" ? "Culoare" : "URL imagine"}
                        </label>
                        {(editingVariationData.variation_visual_type ?? variation.variation_visual_type) === "color" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={isValidColorHex(editingVariationData.variation_visual_value ?? variation.variation_visual_value ?? "") ? (editingVariationData.variation_visual_value ?? variation.variation_visual_value ?? "#000000") : "#000000"}
                              onChange={(e) => setEditingVariationData(d => ({ ...d, variation_visual_value: e.target.value }))}
                              className="w-9 h-9 rounded cursor-pointer border border-zinc-700 bg-transparent p-0.5"
                            />
                            <span className="text-xs font-mono text-zinc-400">{editingVariationData.variation_visual_value ?? variation.variation_visual_value ?? "#000000"}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={editingVariationData.variation_visual_value ?? variation.variation_visual_value ?? ""}
                            onChange={(e) => setEditingVariationData(d => ({ ...d, variation_visual_value: e.target.value }))}
                            className="input"
                            placeholder="https://..."
                          />
                        )}
                      </div>
                    </div>
                    {/* SKU format warning in edit mode */}
                    {skuNeedsWarning(editingVariationData.sku ?? variation.sku) && (
                      <p className="text-xs text-amber-400">
                        Formatul recomandat: LITERE-CIFRE-LITERE (ex: ABC-123-VERDE). Poți folosi orice format.
                      </p>
                    )}
                    {editVariationError && (
                      <p className="text-xs text-red-400">{editVariationError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveVariation(variation.id)}
                        disabled={isSavingEditVariation}
                        className="btn btn-sm btn-primary"
                      >
                        {isSavingEditVariation ? "Se salvează..." : "Salvează"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingVariationId(null); setEditingVariationData({}); setEditVariationError(null); }}
                        className="btn btn-sm btn-secondary"
                      >
                        Anulează
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display row */
                  <div className="flex items-center gap-3">
                    {/* Visual preview */}
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-zinc-700/60 bg-zinc-800/60 flex items-center justify-center">
                      {variation.variation_visual_type === "image" && variation.variation_visual_value ? (
                        <img src={variation.variation_visual_value} alt={variation.name} className="w-full h-full object-cover" />
                      ) : variation.variation_visual_type === "color" && variation.variation_visual_value ? (
                        <div className="w-full h-full" style={{ backgroundColor: variation.variation_visual_value }} />
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </div>

                    {/* Name + SKU */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{variation.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{variation.sku}</p>
                    </div>

                    {/* In stock toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleInStock(variation)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                        variation.in_stock
                          ? "bg-emerald-900/20 border-emerald-800/60 text-emerald-400"
                          : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400"
                      }`}
                      title={variation.in_stock ? "În stoc — apasă pentru a marca lipsă stoc" : "Lipsă stoc — apasă pentru a marca în stoc"}
                    >
                      {variation.in_stock ? "În stoc" : "Lipsă stoc"}
                    </button>

                    {/* Status toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleVariationStatus(variation)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                        variation.status === "active"
                          ? "bg-zinc-800/60 border-zinc-700/60 text-zinc-400"
                          : "bg-zinc-900/60 border-zinc-800/60 text-zinc-600"
                      }`}
                      title={variation.status === "active" ? "Activ — apasă pentru dezactivare" : "Inactiv — apasă pentru activare"}
                    >
                      {variation.status === "active" ? "Activ" : "Inactiv"}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVariationId(variation.id);
                        setEditingVariationData({});
                        setEditVariationError(null);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-colors text-xs"
                    >
                      Editează
                    </button>

                    {/* Delete */}
                    {confirmDeleteVariationId === variation.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setConfirmDeleteVariationId(null); handleDeleteVariation(variation.id); }}
                          disabled={deletingVariationId === variation.id}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          Confirmă
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteVariationId(null)}
                          className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60 rounded-lg transition-colors"
                        >
                          Anulează
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteVariationId(variation.id)}
                        disabled={deletingVariationId === variation.id}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Șterge variația"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add variation form */}
        {showAddVariation && (
          <div className="border-t border-zinc-800/60 px-5 py-4 bg-zinc-950/40 space-y-4">
            <p className="text-xs font-semibold text-zinc-300">Variație nouă</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nume *</label>
                <input
                  type="text"
                  value={newVariation.name}
                  onChange={(e) => setNewVariation(v => ({ ...v, name: e.target.value }))}
                  className="input"
                  placeholder="ex. Verde"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="label">SKU *</label>
                <input
                  type="text"
                  value={newVariation.sku}
                  onChange={(e) => setNewVariation(v => ({ ...v, sku: e.target.value.toUpperCase() }))}
                  className="input font-mono"
                  placeholder={`${formData.sku}-VERDE`}
                  maxLength={30}
                />
                <p className="text-faint text-xs mt-1">Maxim 30 caractere.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Vizual</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVariation(v => ({ ...v, variation_visual_type: "image", variation_visual_value: "" }))}
                    className={`btn btn-sm gap-1.5 ${newVariation.variation_visual_type === "image" ? "btn-primary" : "btn-secondary"}`}
                  >
                    <ImageIcon className="w-3 h-3" /> Imagine
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVariation(v => ({ ...v, variation_visual_type: "color", variation_visual_value: "" }))}
                    className={`btn btn-sm gap-1.5 ${newVariation.variation_visual_type === "color" ? "btn-primary" : "btn-secondary"}`}
                  >
                    <Palette className="w-3 h-3" /> Culoare
                  </button>
                </div>
              </div>
              <div>
                <label className="label">
                  {newVariation.variation_visual_type === "color" ? "Culoare" : "URL imagine"}
                </label>
                {newVariation.variation_visual_type === "color" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={isValidColorHex(newVariation.variation_visual_value) ? newVariation.variation_visual_value : "#000000"}
                      onChange={(e) => setNewVariation(v => ({ ...v, variation_visual_value: e.target.value }))}
                      className="w-9 h-9 rounded cursor-pointer border border-zinc-700 bg-transparent p-0.5"
                    />
                    <span className="text-xs font-mono text-zinc-400">{newVariation.variation_visual_value || "#000000"}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newVariation.variation_visual_value}
                    onChange={(e) => setNewVariation(v => ({ ...v, variation_visual_value: e.target.value }))}
                    className="input"
                    placeholder="https://imagedelivery.net/..."
                  />
                )}
              </div>
            </div>

            {/* SKU format warning */}
            {skuNeedsWarning(newVariation.sku) && (
              <p className="text-xs text-amber-400">
                Formatul recomandat: LITERE-CIFRE-LITERE (ex: ABC-123-VERDE). Poți folosi orice format.
              </p>
            )}

            {variationError && (
              <p className="text-xs text-red-400">{variationError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddVariation}
                disabled={isSavingVariation || !newVariation.name.trim() || !newVariation.sku.trim()}
                className="btn btn-sm btn-primary"
              >
                {isSavingVariation ? "Se adaugă..." : "Adaugă variația"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddVariation(false); setVariationError(null); }}
                className="btn btn-sm btn-secondary"
              >
                Anulează
              </button>
            </div>

            {variations.length >= 5 && (
              <p className="text-xs text-amber-500">Notă: poți adăuga maxim 6 variații per produs.</p>
            )}
          </div>
        )}

        {variations.length > 0 && (
          <div className="px-5 py-4 border-t border-zinc-800/60 bg-zinc-950/30 space-y-3">
            <div>
              <label className="label">Titlu selector variații</label>
              <input
                type="text"
                value={variationsLabel}
                onChange={(e) => setVariationsLabel(e.target.value)}
                onBlur={(e) => handleSaveVariationsLabel(e.target.value)}
                className="input"
                placeholder='ex. "Alege culoarea dorită"'
                maxLength={50}
                disabled={isSavingLabel}
              />
              <p className="text-faint text-xs mt-1">
                Afișat în widget deasupra selectorului de variații. Maxim 50 caractere.
                {isSavingLabel && <span className="ml-2 text-zinc-500">Se salvează...</span>}
              </p>
            </div>
            <p className="text-xs text-zinc-600">Clientul distribuie cantitatea ofertei între variațiile active și în stoc. Toate au același preț.</p>
          </div>
        )}
      </div>

    </div>
  );
}
