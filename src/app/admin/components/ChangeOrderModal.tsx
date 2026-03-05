"use client";

import { useState, useEffect, useRef } from "react";
import type { Order } from "@/lib/types";

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
}

interface UpsellRow {
  upsellId?: string;
  title: string;
  productName?: string;
  productSku?: string | null;
  quantity: number;
  price: number;
  type: string;
}

export interface ChangeOrderData {
  productQuantity: number;
  unitPrice: number;
  upsells: UpsellRow[];
  shippingCost: number;
  subtotal: number;
  total: number;
}

interface ChangeOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (changes: ChangeOrderData) => Promise<void>;
}

function formatOrderNumber(orderNumber?: number, orderSeries?: string, fallbackId?: string): string {
  if (orderNumber != null) {
    const series = orderSeries ? orderSeries.replace(/-$/, "") : "";
    const num = String(orderNumber).padStart(5, "0");
    return series ? `${series}-${num}` : num;
  }
  return fallbackId?.slice(0, 8) || "";
}

export default function ChangeOrderModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: ChangeOrderModalProps) {
  const [productQuantity, setProductQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [upsells, setUpsells] = useState<UpsellRow[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Add product state
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const addProductRef = useRef<HTMLDivElement>(null);

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/products/active")
        .then((res) => res.json())
        .then((data) => setAvailableProducts(data.products || []))
        .catch(() => setAvailableProducts([]));
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isAddProductOpen) return;
    function handleClick(e: MouseEvent) {
      if (addProductRef.current && !addProductRef.current.contains(e.target as Node)) {
        setIsAddProductOpen(false);
        setProductSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isAddProductOpen]);

  useEffect(() => {
    if (isOpen && order) {
      const qty = order.productQuantity || 1;
      setProductQuantity(qty);
      setUnitPrice(qty > 0 ? (order.subtotal || 0) / qty : 0);
      setShippingCost(order.shippingCost || 0);
      setSubmitError(null);
      setIsSubmitting(false);

      // Clone upsells
      const rawUpsells = order.upsells || [];
      if (Array.isArray(rawUpsells)) {
        setUpsells(
          rawUpsells.map((u: any) => ({
            upsellId: u.upsellId || u.id,
            title: u.title || u.productName || "Upsell",
            productName: u.productName,
            productSku: u.productSku,
            quantity: u.quantity || 1,
            price: u.price || 0,
            type: u.type || "presale",
          }))
        );
      } else {
        setUpsells([]);
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const subtotal = unitPrice * productQuantity;
  const upsellsTotal = upsells.reduce((sum, u) => sum + u.price * u.quantity, 0);
  const total = subtotal + upsellsTotal + shippingCost;

  function handleRemoveUpsell(index: number) {
    setUpsells((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpsellChange(index: number, field: "quantity" | "price", value: number) {
    setUpsells((prev) =>
      prev.map((u, i) => (i === index ? { ...u, [field]: value } : u))
    );
  }

  function handleAddProduct(product: ProductOption) {
    setUpsells((prev) => [
      ...prev,
      {
        upsellId: product.id,
        title: product.name,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
        price: 0,
        type: "presale",
      },
    ]);
    setIsAddProductOpen(false);
    setProductSearch("");
  }

  const filteredProducts = availableProducts.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onConfirm({
        productQuantity,
        unitPrice,
        upsells,
        shippingCost,
        subtotal,
        total,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Eroare la modificarea comenzii"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const orderLabel = formatOrderNumber(order.orderNumber, order.orderSeries, order.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-zinc-900 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto border border-zinc-700 shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-white">MODIFICĂ COMANDA</h2>
            <p className="text-xs text-amber-400 font-medium mt-0.5">{orderLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
          {/* Main Product */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Produs principal
            </p>
            <p className="text-sm text-white font-medium mb-1">
              {order.productName || "Produs"}
            </p>
            {order.productSku && (
              <p className="text-xs text-zinc-500 mb-3">SKU: {order.productSku}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Cantitate</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Preț unitar (RON)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Subtotal: <span className="text-zinc-300">{subtotal.toFixed(2)} RON</span>
            </p>
          </div>

          {/* Upsells */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Produse adiționale {upsells.length > 0 && `(${upsells.length})`}
            </p>
            {upsells.length > 0 && (
              <div className="space-y-3 mb-3">
                {upsells.map((upsell, index) => (
                  <div
                    key={index}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm text-white">
                          {upsell.title || upsell.productName}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            upsell.type === "postsale"
                              ? "bg-purple-900/50 text-purple-300"
                              : "bg-emerald-900/50 text-emerald-300"
                          }`}
                        >
                          {upsell.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveUpsell(index)}
                        className="text-red-400 hover:text-red-300 text-sm font-bold ml-2"
                        title="Elimină produs"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">Cant.</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={upsell.quantity}
                          onChange={(e) =>
                            handleUpsellChange(index, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">Preț (RON)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={upsell.price}
                          onChange={(e) =>
                            handleUpsellChange(index, "price", Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">Total</label>
                        <p className="text-xs text-zinc-300 py-1.5">
                          {(upsell.price * upsell.quantity).toFixed(2)} RON
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Product Button + Dropdown */}
            <div className="relative" ref={addProductRef}>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(!isAddProductOpen)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-amber-400 border border-dashed border-amber-600/50 rounded-lg hover:bg-amber-900/20 transition-colors"
              >
                + Adaugă produs
              </button>
              {isAddProductOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-20 max-h-52 flex flex-col">
                  <div className="p-2 border-b border-zinc-700">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Caută produs..."
                      autoFocus
                      className="w-full bg-zinc-900 border border-zinc-600 rounded px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none placeholder-zinc-500"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-zinc-500 px-3 py-3 text-center">
                        Niciun produs găsit
                      </p>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-700 transition-colors flex items-center justify-between"
                        >
                          <span className="text-white">{product.name}</span>
                          {product.sku && (
                            <span className="text-zinc-500 ml-2">{product.sku}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-2">
              Cost livrare (RON)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={shippingCost}
              onChange={(e) => setShippingCost(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Total Summary */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Subtotal produs</span>
              <span>{subtotal.toFixed(2)} RON</span>
            </div>
            {upsellsTotal > 0 && (
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Upsells</span>
                <span>{upsellsTotal.toFixed(2)} RON</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Livrare</span>
              <span>{shippingCost.toFixed(2)} RON</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-600">
              <span>TOTAL</span>
              <span className="text-amber-400">{total.toFixed(2)} RON</span>
            </div>
          </div>

          {/* Helpship Warning */}
          {order.helpshipOrderId && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-300">
                Comanda va fi recreată în Helpship (cancel + creare nouă)
              </p>
            </div>
          )}

          {/* Error */}
          {submitError && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
              <p className="text-xs text-red-300">{submitError}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors"
            >
              Renunță
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Se salvează..." : "Salvează Modificările"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
