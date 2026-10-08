"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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

interface LandingPage {
  id: string;
  product_id: string;
  store_id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  thank_you_path?: string;
  main_sku?: string;
  quantity_offer_1?: number;
  quantity_offer_2?: number;
  quantity_offer_3?: number;
  offer_heading_1?: string;
  offer_heading_2?: string;
  offer_heading_3?: string;
  numeral_1?: string;
  numeral_2?: string;
  numeral_3?: string;
  order_button_text: string;
  srp: number;
  price_1: number;
  price_2: number;
  price_3: number;
  shipping_price: number;
  post_purchase_status: boolean;
  fb_pixel_id?: string;
  fb_conversion_token?: string;
  client_side_tracking: boolean;
  server_side_tracking: boolean;
  default_offer?: string;
  variations_label?: string;
}

export default function EditLandingPagePage() {
  const router = useRouter();
  const params = useParams();
  const landingPageId = params.id as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [formData, setFormData] = useState<LandingPage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [selectedProductVariationsCount, setSelectedProductVariationsCount] = useState(0);
  const [postsaleUpsells, setPostsaleUpsells] = useState<any[]>([]);
  const [isLoadingUpsells, setIsLoadingUpsells] = useState(true);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugUsedBy, setSlugUsedBy] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (landingPageId) {
      fetchProducts();
      fetchStores();
      fetchLandingPage();
      fetchUpsells();
    }
  }, [landingPageId]);

  useEffect(() => {
    if (!slugEdited) return;
    const slug = formData?.slug?.trim();
    if (!slug) {
      setSlugStatus("idle");
      setSlugUsedBy(null);
      return;
    }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (landingPageId) params.set("excludeId", landingPageId);
        const res = await fetch(`/api/landing-pages/check-slug?${params}`);
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
  }, [formData?.slug, landingPageId, slugEdited]);

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

  async function fetchLandingPage() {
    try {
      setIsLoadingPage(true);
      const response = await fetch("/api/landing-pages");
      
      if (!response.ok) {
        throw new Error("Failed to fetch landing pages");
      }

      const data = await response.json();
      const page = data.landingPages?.find((p: LandingPage) => p.id === landingPageId);
      
      if (!page) {
        throw new Error("Landing page not found");
      }

      setFormData(page);
      // Set search values for display
      const product = data.landingPages?.find((p: any) => p.id === landingPageId)?.products;
      const store = data.landingPages?.find((p: any) => p.id === landingPageId)?.stores;
      if (product) setProductSearch(product.name);
      if (store) setStoreSearch(store.url);
      // Load variations count for the product
      if (page.product_id) {
        try {
          const r = await fetch(`/api/products/${page.product_id}`);
          const d = await r.json();
          setSelectedProductVariationsCount((d.product?.variations || []).length);
        } catch { /* non-blocking */ }
      }
    } catch (err) {
      console.error("Error fetching landing page:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load landing page",
      });
    } finally {
      setIsLoadingPage(false);
    }
  }

  async function fetchUpsells() {
    try {
      setIsLoadingUpsells(true);
      const response = await fetch("/api/upsells");

      if (!response.ok) {
        console.error("Failed to fetch upsells");
        return;
      }

      const data = await response.json();
      const allUpsells = data.upsells || [];

      // Filter postsale upsells for this landing page
      const postsale = allUpsells.filter(
        (u: any) => u.landing_page_id === landingPageId && u.type === "postsale"
      );

      setPostsaleUpsells(postsale);
    } catch (err) {
      console.error("Error fetching upsells:", err);
    } finally {
      setIsLoadingUpsells(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/landing-pages/${landingPageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: formData.product_id,
          storeId: formData.store_id,
          name: formData.name,
          slug: formData.slug,
          thankYouPath: formData.thank_you_path || "thank-you",
          mainSku: products.find(p => p.id === formData.product_id)?.sku || "",
          quantityOffer1: formData.quantity_offer_1 || 1,
          quantityOffer2: formData.quantity_offer_2 || 2,
          quantityOffer3: formData.quantity_offer_3 || 3,
          offerHeading1: formData.offer_heading_1 || "Ieftin",
          offerHeading2: formData.offer_heading_2 || "Avantajos",
          offerHeading3: formData.offer_heading_3 || "Super ofertă",
          numeral1: formData.numeral_1 || "1 bucată",
          numeral2: formData.numeral_2 || "Două bucăți",
          numeral3: formData.numeral_3 || "Trei bucăți",
          orderButtonText: formData.order_button_text,
          srp: formData.srp,
          price1: formData.price_1,
          price2: formData.price_2,
          price3: formData.price_3,
          shippingPrice: formData.shipping_price,
          free_shipping_offer_1: (formData as any).free_shipping_offer_1 || false,
          free_shipping_offer_2: (formData as any).free_shipping_offer_2 || false,
          free_shipping_offer_3: (formData as any).free_shipping_offer_3 || false,
          defaultOffer: formData.default_offer || "offer_1",
          postPurchaseStatus: formData.post_purchase_status,
          fbPixelId: formData.fb_pixel_id || "",
          fbConversionToken: formData.fb_conversion_token || "",
          clientSideTracking: formData.client_side_tracking,
          serverSideTracking: formData.server_side_tracking,
          variationsLabel: formData.variations_label || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update landing page");
      }

      setMessage({ type: "success", text: "Landing page updated successfully!" });
      
      setTimeout(() => {
        router.push("/admin/landing-pages");
      }, 1000);
    } catch (error) {
      console.error("Error updating landing page:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update landing page",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!formData) return;

    const currentStatus = formData.status;
    const newStatus = currentStatus === "published" ? "draft" : "published";

    try {
      const response = await fetch(`/api/landing-pages/${landingPageId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setFormData({ ...formData, status: newStatus });
      setMessage({
        type: "success",
        text: `Status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      setMessage({
        type: "error",
        text: "Failed to update status",
      });
    }
  }

  if (isLoadingPage) {
    return (
      <div className="max-w-4xl">
        <div className="card p-4 text-center">
          <p className="text-zinc-400 text-sm">Se încarcă pagina...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-xl border border-red-800/60 bg-red-900/20 px-4 py-3">
          <p className="text-red-400 text-sm">Pagina nu a fost găsită</p>
          <Link href="/admin/landing-pages" className="text-emerald-400 hover:text-emerald-300 mt-2 inline-block text-sm">
            ← Înapoi la pagini
          </Link>
        </div>
      </div>
    );
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
        <h1 className="page-title">Editează pagina de vânzare</h1>
        <p className="page-subtitle text-sm mt-1">
          Modifică detaliile paginii
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
                            setFormData({ ...formData, product_id: product.id });
                            setProductSearch(product.name);
                            setShowProductDropdown(false);
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
                {formData.product_id && (
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                    <p className="text-sm text-white font-medium">
                      {products.find(p => p.id === formData.product_id)?.name || "Loading..."}
                    </p>
                    {products.find(p => p.id === formData.product_id)?.sku && (
                      <p className="text-xs text-zinc-400 mt-1">
                        SKU: {products.find(p => p.id === formData.product_id)?.sku}
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
                    value={formData?.variations_label || ""}
                    onChange={(e) => setFormData(f => f ? { ...f, variations_label: e.target.value } : f)}
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
                            setFormData({ ...formData, store_id: store.id });
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
                {formData.store_id && (
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                    <p className="text-sm text-white font-medium">
                      {stores.find(s => s.id === formData.store_id)?.url || "Loading..."}
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
                  onChange={(e) => { setSlugEdited(true); setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }}
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
                  value={formData.thank_you_path || "thank-you"}
                  onChange={(e) => setFormData({ ...formData, thank_you_path: e.target.value })}
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">
                    Titlu ofertă 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.offer_heading_1 || "Ieftin"}
                    onChange={(e) => setFormData({ ...formData, offer_heading_1: e.target.value })}
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
                    value={formData.offer_heading_2 || "Avantajos"}
                    onChange={(e) => setFormData({ ...formData, offer_heading_2: e.target.value })}
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
                    value={formData.offer_heading_3 || "Super ofertă"}
                    onChange={(e) => setFormData({ ...formData, offer_heading_3: e.target.value })}
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">
                    Numeral 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral_1 || "1 bucată"}
                    onChange={(e) => setFormData({ ...formData, numeral_1: e.target.value })}
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
                    value={formData.numeral_2 || "Două bucăți"}
                    onChange={(e) => setFormData({ ...formData, numeral_2: e.target.value })}
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
                    value={formData.numeral_3 || "Trei bucăți"}
                    onChange={(e) => setFormData({ ...formData, numeral_3: e.target.value })}
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
                  value={formData.order_button_text || "Plasează comanda!"}
                  onChange={(e) => setFormData({ ...formData, order_button_text: e.target.value })}
                  className="input max-w-md"
                  placeholder="Plasează comanda!"
                  maxLength={30}
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Max. 30 caractere
                </p>
              </div>

              {/* Default Offer Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Oferta preselectata in formular
                </label>
                <select
                  value={formData.default_offer || "offer_1"}
                  onChange={(e) => setFormData({ ...formData, default_offer: e.target.value })}
                  className="w-full max-w-md px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm"
                >
                  <option value="offer_1">Oferta 1 — {formData.offer_heading_1 || "Ieftin"}</option>
                  <option value="offer_2">Oferta 2 — {formData.offer_heading_2 || "Avantajos"}</option>
                  <option value="offer_3">Oferta 3 — {formData.offer_heading_3 || "Super ofertă"}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Offer Quantities */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Cantități oferte
            </h2>
            <p className="text-sm text-zinc-400 mb-3">
              Configurează câte bucăți conține fiecare ofertă. SKU-ul produsului este preluat automat.
            </p>

            <div className="space-y-3">
              {/* Quantities */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">
                    Cantitate ofertă 1
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_offer_1 || 1}
                    onChange={(e) => setFormData({ ...formData, quantity_offer_1: parseInt(e.target.value) || 1 })}
                    className="input"
                    placeholder="1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Numărul de bucăți din oferta 1 (implicit: 1)
                  </p>
                </div>
                <div>
                  <label className="label">
                    Cantitate ofertă 2
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_offer_2 || 2}
                    onChange={(e) => setFormData({ ...formData, quantity_offer_2: parseInt(e.target.value) || 2 })}
                    className="input"
                    placeholder="2"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Numărul de bucăți din oferta 2 (implicit: 2)
                  </p>
                </div>
                <div>
                  <label className="label">
                    Cantitate ofertă 3
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_offer_3 || 3}
                    onChange={(e) => setFormData({ ...formData, quantity_offer_3: parseInt(e.target.value) || 3 })}
                    className="input"
                    placeholder="3"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Numărul de bucăți din oferta 3 (implicit: 3)
                  </p>
                </div>
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
                  onChange={(e) => setFormData({ ...formData, srp: parseFloat(e.target.value) || 0 })}
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">
                    Preț 1 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999"
                    value={formData.price_1}
                    onChange={(e) => setFormData({ ...formData, price_1: parseFloat(e.target.value) || 0 })}
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
                    value={formData.price_2}
                    onChange={(e) => setFormData({ ...formData, price_2: parseFloat(e.target.value) || 0 })}
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
                    value={formData.price_3}
                    onChange={(e) => setFormData({ ...formData, price_3: parseFloat(e.target.value) || 0 })}
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
                  value={formData.shipping_price}
                  onChange={(e) => setFormData({ ...formData, shipping_price: parseFloat(e.target.value) || 0 })}
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
                      checked={(formData as any)?.free_shipping_offer_1 || false}
                      onChange={(e) => setFormData({ ...formData!, free_shipping_offer_1: e.target.checked } as any)}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-300">Oferta 1</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData as any)?.free_shipping_offer_2 || false}
                      onChange={(e) => setFormData({ ...formData!, free_shipping_offer_2: e.target.checked } as any)}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-300">Oferta 2</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData as any)?.free_shipping_offer_3 || false}
                      onChange={(e) => setFormData({ ...formData!, free_shipping_offer_3: e.target.checked } as any)}
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
                  checked={formData.post_purchase_status && postsaleUpsells.length > 0}
                  onChange={(e) => setFormData({ ...formData, post_purchase_status: e.target.checked })}
                  disabled={postsaleUpsells.length === 0}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="postPurchaseStatus" className="ml-2">
                  <span className="block text-xs font-medium text-zinc-300">
                    Status post-cumpărare
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {postsaleUpsells.length === 0 ? (
                      <span className="text-amber-400">
                        ⚠️ Trebuie să existe un postsale upsell pentru a activa această opțiune
                      </span>
                    ) : (
                      "Activează pentru a permite comenzile să intre în queue și să arate oferta postsale"
                    )}
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
                  value={formData.fb_pixel_id || ""}
                  onChange={(e) => setFormData({ ...formData, fb_pixel_id: e.target.value })}
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
                  value={formData.fb_conversion_token || ""}
                  onChange={(e) => setFormData({ ...formData, fb_conversion_token: e.target.value })}
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
                  checked={formData.client_side_tracking}
                  onChange={(e) => setFormData({ ...formData, client_side_tracking: e.target.checked })}
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
                  checked={formData.server_side_tracking}
                  onChange={(e) => setFormData({ ...formData, server_side_tracking: e.target.checked })}
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
          <div className="p-4 bg-zinc-900/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/landing-pages"
                className="btn btn-secondary"
              >
                Anulează
              </Link>
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`btn ${
                  formData?.status === "published"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "btn-primary"
                }`}
              >
                {formData?.status === "published" ? "Marchează ca Draft" : "Publică"}
              </button>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
