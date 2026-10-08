"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  sku?: string;
  status?: string;
}

interface Store {
  id: string;
  url: string;
}

export default function NewLandingPagePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  
  const [formData, setFormData] = useState({
    // Basic Info
    productId: "",
    storeId: "",
    name: "",
    slug: "",
    thankYouPath: "thank-you",
    // Offer Settings (with defaults)
    offerHeading1: "Ieftin",
    offerHeading2: "Avantajos",
    offerHeading3: "Super ofertă",
    numeral1: "1 bucată",
    numeral2: "Două bucăți",
    numeral3: "Trei bucăți",
    orderButtonText: "Plasează comanda!",
    // Pricing
    srp: "",
    price1: "",
    price2: "",
    price3: "",
    shippingPrice: "",
    freeShippingOffer1: false,
    freeShippingOffer2: false,
    freeShippingOffer3: false,
    postPurchaseStatus: false,
    // Conversion Tracking
    fbPixelId: "",
    fbConversionToken: "",
    clientSideTracking: false,
    serverSideTracking: false,
    // Variations
    variationsLabel: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugUsedBy, setSlugUsedBy] = useState<string | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [selectedProductVariationsCount, setSelectedProductVariationsCount] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchStores();
  }, []);

  useEffect(() => {
    const slug = formData.slug.trim();
    if (!slug) {
      setSlugStatus("idle");
      setSlugUsedBy(null);
      return;
    }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/landing-pages/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.available) {
          setSlugStatus("available");
          setSlugUsedBy(null);
        } else {
          setSlugStatus("taken");
          setSlugUsedBy(data.usedBy || null);
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.slug]);

  async function fetchProducts() {
    try {
      setIsLoadingProducts(true);
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function fetchStores() {
    try {
      setIsLoadingStores(true);
      const response = await fetch("/api/stores");
      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
    } finally {
      setIsLoadingStores(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/landing-pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          srp: parseFloat(formData.srp),
          price1: parseFloat(formData.price1),
          price2: parseFloat(formData.price2),
          price3: parseFloat(formData.price3),
          shippingPrice: parseFloat(formData.shippingPrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || "Failed to create landing page";
        throw new Error(errorMsg);
      }

      setMessage({ type: "success", text: "Pagina a fost creată cu succes!" });

      setTimeout(() => {
        router.push("/admin/landing-pages");
      }, 1000);
    } catch (error) {
      console.error("Error creating landing page:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Eroare la crearea paginii",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const filteredProducts = products.filter(p => {
    // Filter out inactive products
    if (p.status === "inactive") return false;

    // Filter by search
    return p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
  });

  const filteredStores = stores.filter(s =>
    s.url.toLowerCase().includes(storeSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Pagină de vânzare nouă</h1>
        <p className="page-subtitle text-sm mt-1">
          Adaugă o pagină nouă pentru produsul tău
        </p>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Informații de bază
            </h2>

            <div className="space-y-3">
              {/* Product */}
              <div>
                <label className="label">
                  Produs *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => {
                      setShowProductDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowProductDropdown(false), 200);
                    }}
                    placeholder="Caută produs..."
                    className="input"
                  />
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg overflow-auto" style={{ maxHeight: '12.5rem' }}>
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={async () => {
                            setFormData({ ...formData, productId: product.id });
                            setProductSearch(product.name);
                            setShowProductDropdown(false);
                            // Check if product has variations
                            try {
                              const r = await fetch(`/api/products/${product.id}`);
                              const d = await r.json();
                              setSelectedProductVariationsCount((d.product?.variations || []).length);
                            } catch { setSelectedProductVariationsCount(0); }
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm text-white border-b border-zinc-700/50 last:border-b-0"
                        >
                          <div className="font-medium">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-zinc-400">SKU: {product.sku}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {showProductDropdown && filteredProducts.length === 0 && productSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg p-3">
                      <p className="text-xs text-zinc-400 italic">Niciun produs găsit</p>
                    </div>
                  )}
                </div>
                {formData.productId && (
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                    <p className="text-sm text-white font-medium">
                      {products.find(p => p.id === formData.productId)?.name}
                    </p>
                    {products.find(p => p.id === formData.productId)?.sku && (
                      <p className="text-xs text-zinc-400 mt-1">
                        SKU: {products.find(p => p.id === formData.productId)?.sku}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Produsul asociat acestei pagini.
                </p>
              </div>

              {/* Variations label — only shown if selected product has variations */}
              {selectedProductVariationsCount > 0 && (
                <div>
                  <label className="label">Etichetă variații</label>
                  <input
                    type="text"
                    value={formData.variationsLabel}
                    onChange={(e) => setFormData({ ...formData, variationsLabel: e.target.value })}
                    className="input"
                    placeholder="ex. Alege culorile dorite"
                    maxLength={60}
                  />
                  <p className="text-faint text-xs mt-1">
                    Text afișat clientului deasupra selectorului de variații. Lasă gol pentru „Alege varianta".
                  </p>
                </div>
              )}

              {/* Store */}
              <div>
                <label className="label">
                  Magazin *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => {
                      setStoreSearch(e.target.value);
                      setShowStoreDropdown(true);
                    }}
                    onFocus={() => {
                      setShowStoreDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowStoreDropdown(false), 200);
                    }}
                    placeholder="Caută magazin..."
                    className="input"
                  />
                  {showStoreDropdown && filteredStores.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg overflow-auto" style={{ maxHeight: '12.5rem' }}>
                      {filteredStores.map((store) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, storeId: store.id });
                            setStoreSearch(store.url);
                            setShowStoreDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm text-white border-b border-zinc-700/50 last:border-b-0"
                        >
                          {store.url}
                        </button>
                      ))}
                    </div>
                  )}
                  {showStoreDropdown && filteredStores.length === 0 && storeSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg p-3">
                      <p className="text-xs text-zinc-400 italic">Niciun magazin găsit</p>
                    </div>
                  )}
                </div>
                {formData.storeId && (
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                    <p className="text-sm text-white font-medium">
                      {stores.find(s => s.id === formData.storeId)?.url}
                    </p>
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Magazinul căruia îi aparține această pagină.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="label">
                  Nume *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Nume"
                  maxLength={30}
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Numele paginii (max. 30 caractere).
                </p>
              </div>

              {/* Slug */}
              <div>
                <label className="label">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className={`input ${slugStatus === "taken" ? "border-red-500" : slugStatus === "available" ? "border-emerald-500" : ""}`}
                  placeholder="Slug"
                  maxLength={30}
                  required
                />
                {slugStatus === "checking" && (
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    Se verifică disponibilitatea...
                  </p>
                )}
                {slugStatus === "available" && (
                  <p className="text-xs text-emerald-400 mt-1">✓ Disponibil</p>
                )}
                {slugStatus === "taken" && (
                  <p className="text-xs text-red-400 mt-1">
                    ✗ Deja folosit{slugUsedBy ? ` de: ${slugUsedBy}` : ""}
                  </p>
                )}
                {slugStatus === "idle" && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Ultima parte din URL-ul paginii. ex: "produs" → www.magazin.ro/produs
                  </p>
                )}
              </div>

              {/* Thank You Path */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Thank You Path *
                </label>
                <input
                  type="text"
                  value={formData.thankYouPath}
                  onChange={(e) => setFormData({ ...formData, thankYouPath: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm"
                  placeholder="thank-you"
                  maxLength={30}
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Example: Thank You path "thank-you" means the Thank You page URL is: https://yourstorename.com/thank-you (max 30 characters)
                </p>
              </div>
            </div>
          </div>

          {/* Offer Settings */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              SETĂRI OFERTE
            </h2>

            <div className="space-y-3">
              {/* Offer Headings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">
                    Titlu ofertă 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.offerHeading1}
                    onChange={(e) => setFormData({ ...formData, offerHeading1: e.target.value })}
                    className="input"
                    placeholder="Ieftin"
                    maxLength={15}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    Titlu ofertă 2 *
                  </label>
                  <input
                    type="text"
                    value={formData.offerHeading2}
                    onChange={(e) => setFormData({ ...formData, offerHeading2: e.target.value })}
                    className="input"
                    placeholder="Avantajos"
                    maxLength={15}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    Titlu ofertă 3 *
                  </label>
                  <input
                    type="text"
                    value={formData.offerHeading3}
                    onChange={(e) => setFormData({ ...formData, offerHeading3: e.target.value })}
                    className="input"
                    placeholder="Super ofertă"
                    maxLength={15}
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Max. 15 caractere fiecare
              </p>

              {/* Numerals */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">
                    Numeral 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral1}
                    onChange={(e) => setFormData({ ...formData, numeral1: e.target.value })}
                    className="input"
                    placeholder="1 bucată"
                    maxLength={20}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    Numeral 2 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral2}
                    onChange={(e) => setFormData({ ...formData, numeral2: e.target.value })}
                    className="input"
                    placeholder="Două bucăți"
                    maxLength={20}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    Numeral 3 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral3}
                    onChange={(e) => setFormData({ ...formData, numeral3: e.target.value })}
                    className="input"
                    placeholder="Trei bucăți"
                    maxLength={20}
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Max. 20 caractere fiecare
              </p>

              {/* Order Button Text */}
              <div>
                <label className="label">
                  Text buton comandă *
                </label>
                <input
                  type="text"
                  value={formData.orderButtonText}
                  onChange={(e) => setFormData({ ...formData, orderButtonText: e.target.value })}
                  className="input max-w-md"
                  placeholder="Plasează comanda!"
                  maxLength={30}
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Max. 30 caractere
                </p>
              </div>
            </div>
          </div>

          {/* Pricing & Shipping */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Prețuri și livrare
            </h2>

            <div className="space-y-3">
              {/* SRP */}
              <div>
                <label className="label">
                  SRP (Preț recomandat) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="999"
                  value={formData.srp}
                  onChange={(e) => setFormData({ ...formData, srp: e.target.value })}
                  onKeyPress={(e) => {
                    if (!/[0-9.]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="input max-w-md"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Prețul afișat ca preț normal, nepromoțional (max. 999).
                </p>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">
                    Preț 1 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999"
                    value={formData.price1}
                    onChange={(e) => setFormData({ ...formData, price1: e.target.value })}
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    O bucată (max. 999)
                  </p>
                </div>
                <div>
                  <label className="label">
                    Preț 2 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999"
                    value={formData.price2}
                    onChange={(e) => setFormData({ ...formData, price2: e.target.value })}
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Două bucăți (max. 999)
                  </p>
                </div>
                <div>
                  <label className="label">
                    Preț 3 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999"
                    value={formData.price3}
                    onChange={(e) => setFormData({ ...formData, price3: e.target.value })}
                    onKeyPress={(e) => {
                      if (!/[0-9.]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Trei bucăți (max. 999)
                  </p>
                </div>
              </div>

              {/* Shipping Price */}
              <div>
                <label className="label">
                  Preț livrare *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  value={formData.shippingPrice}
                  onChange={(e) => setFormData({ ...formData, shippingPrice: e.target.value })}
                  onKeyPress={(e) => {
                    if (!/[0-9.]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="input max-w-md"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Prețul plătit de client pentru livrare (max. 99).
                </p>
              </div>

              {/* Free Shipping per Offer */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Transport Gratuit
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.freeShippingOffer1}
                      onChange={(e) => setFormData({ ...formData, freeShippingOffer1: e.target.checked })}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-300">Oferta 1</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.freeShippingOffer2}
                      onChange={(e) => setFormData({ ...formData, freeShippingOffer2: e.target.checked })}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-300">Oferta 2</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.freeShippingOffer3}
                      onChange={(e) => setFormData({ ...formData, freeShippingOffer3: e.target.checked })}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-300">Oferta 3</span>
                  </label>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Ofertele selectate vor avea transport gratuit (0 Lei).
                </p>
              </div>

              {/* Post Purchase Status */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="postPurchaseStatus"
                  checked={false}
                  onChange={(e) => setFormData({ ...formData, postPurchaseStatus: e.target.checked })}
                  disabled={true}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="postPurchaseStatus" className="ml-2">
                  <span className="block text-xs font-medium text-zinc-300">
                    Status post-cumpărare
                  </span>
                  <span className="block text-xs text-zinc-500">
                    <span className="text-amber-400">
                      ⚠️ Trebuie să adaugi un postsale upsell după crearea landing page-ului pentru a activa această opțiune
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Conversion Tracking */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Urmărire conversii
            </h2>

            <div className="space-y-3">
              {/* Facebook Pixel ID */}
              <div>
                <label className="label">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  value={formData.fbPixelId}
                  onChange={(e) => setFormData({ ...formData, fbPixelId: e.target.value })}
                  className="input max-w-md"
                  placeholder="Lasă gol pentru a folosi setările magazinului."
                />
                <p className="text-xs text-zinc-500 mt-1">
                  ID-ul Pixel-ului Facebook pentru urmărire.
                </p>
              </div>

              {/* Conversion API Token */}
              <div>
                <label className="label">
                  Conversion API Token
                </label>
                <input
                  type="text"
                  value={formData.fbConversionToken}
                  onChange={(e) => setFormData({ ...formData, fbConversionToken: e.target.value })}
                  className="input max-w-md"
                  placeholder="Lasă gol pentru a folosi setările magazinului."
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Token-ul API de conversii Facebook.
                </p>
              </div>

              {/* Client-side Tracking */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="clientSideTracking"
                  checked={formData.clientSideTracking}
                  onChange={(e) => setFormData({ ...formData, clientSideTracking: e.target.checked })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded"
                />
                <label htmlFor="clientSideTracking" className="ml-2">
                  <span className="block text-xs font-medium text-zinc-300">
                    Tracking client (Facebook Pixel)
                  </span>
                  <span className="block text-xs text-zinc-500">
                    Instalează automat codul Pixel Facebook pe site.
                  </span>
                </label>
              </div>

              {/* Server-side Tracking */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="serverSideTracking"
                  checked={formData.serverSideTracking}
                  onChange={(e) => setFormData({ ...formData, serverSideTracking: e.target.checked })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded"
                />
                <label htmlFor="serverSideTracking" className="ml-2">
                  <span className="block text-xs font-medium text-zinc-300">
                    Tracking server (Conversion API)
                  </span>
                  <span className="block text-xs text-zinc-500">
                    Activează urmărirea conversiilor server-side.
                  </span>
                </label>
              </div>

            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="p-4 border-b border-zinc-700/50">
              <div
                className={message.type === "success"
                  ? "rounded-xl border border-emerald-800/60 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-400"
                  : "rounded-xl border border-red-800/60 bg-red-900/20 px-4 py-3 text-sm text-red-400"
                }
              >
                {message.text}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-4 bg-zinc-900/50 flex justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-secondary"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Se creează..." : "Creează pagina"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
