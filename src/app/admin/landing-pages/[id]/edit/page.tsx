"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku?: string;
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
  custom_event_name?: string;
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

  useEffect(() => {
    if (landingPageId) {
      fetchProducts();
      fetchStores();
      fetchLandingPage();
    }
  }, [landingPageId]);

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
          postPurchaseStatus: formData.post_purchase_status,
          fbPixelId: formData.fb_pixel_id || "",
          fbConversionToken: formData.fb_conversion_token || "",
          clientSideTracking: formData.client_side_tracking,
          serverSideTracking: formData.server_side_tracking,
          customEventName: formData.custom_event_name || "",
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
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-4 text-center">
          <p className="text-zinc-400 text-sm">Loading landing page...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">Landing page not found</p>
          <Link href="/admin/landing-pages" className="text-emerald-400 hover:text-emerald-300 mt-2 inline-block text-sm">
            ← Back to Landing Pages
          </Link>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filteredStores = stores.filter(s =>
    s.url.toLowerCase().includes(storeSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Edit Landing Page</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update your landing page details
        </p>
      </div>

      {/* Form */}
      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50">
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Basic Information
            </h2>

            <div className="space-y-3">
              {/* Product */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Product *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => setProductSearch("")}
                    placeholder="Search for product..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm"
                  />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, product_id: product.id });
                            setProductSearch("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm text-white"
                        >
                          <div className="font-medium">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-zinc-400">SKU: {product.sku}</div>
                          )}
                        </button>
                      ))}
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
                  Select the product associated with this landing page.
                </p>
              </div>

              {/* Store */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Store *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    onFocus={() => setStoreSearch("")}
                    placeholder="Search for store..."
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  />
                  {storeSearch && filteredStores.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredStores.map((store) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, store_id: store.id });
                            setStoreSearch("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-900/50 text-sm text-white"
                        >
                          {store.url}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formData.store_id && (
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded-md">
                    <p className="text-sm text-white font-medium">
                      {stores.find(s => s.id === formData.store_id)?.url || "Loading..."}
                    </p>
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Choose the store this landing page belongs to.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Name"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Enter a descriptive name for this landing page.
                </p>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Slug"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Enter a name for the final part of the landing page link. e.g: "product" will become www.yourstore.com/product
                </p>
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
                  className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="thank-you"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Example: Thank You path "thank-you" means the Thank You page URL is: https://yourstorename.com/thank-you
                </p>
              </div>
            </div>
          </div>

          {/* Offer Settings */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Offer Settings
            </h2>

            <div className="space-y-3">
              {/* Offer Headings */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Offer Heading 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.offer_heading_1 || "Ieftin"}
                    onChange={(e) => setFormData({ ...formData, offer_heading_1: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="Ieftin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Offer Heading 2 *
                  </label>
                  <input
                    type="text"
                    value={formData.offer_heading_2 || "Avantajos"}
                    onChange={(e) => setFormData({ ...formData, offer_heading_2: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="Avantajos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Offer Heading 3 *
                  </label>
                  <input
                    type="text"
                    value={formData.offer_heading_3 || "Super ofertă"}
                    onChange={(e) => setFormData({ ...formData, offer_heading_3: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="Super ofertă"
                    required
                  />
                </div>
              </div>

              {/* Numerals */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Numeral 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral_1 || "1 bucată"}
                    onChange={(e) => setFormData({ ...formData, numeral_1: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="1 bucată"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Numeral 2 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral_2 || "Două bucăți"}
                    onChange={(e) => setFormData({ ...formData, numeral_2: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="Două bucăți"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Numeral 3 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral_3 || "Trei bucăți"}
                    onChange={(e) => setFormData({ ...formData, numeral_3: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="Trei bucăți"
                    required
                  />
                </div>
              </div>

              {/* Order Button Text */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Order Button Text *
                </label>
                <input
                  type="text"
                  value={formData.order_button_text || "Plasează comanda!"}
                  onChange={(e) => setFormData({ ...formData, order_button_text: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Plasează comanda!"
                  required
                />
              </div>
            </div>
          </div>

          {/* Offer Quantities */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Offer Quantities
            </h2>
            <p className="text-sm text-zinc-400 mb-3">
              Configure how many pieces each offer contains. The product SKU is taken automatically from the selected product.
            </p>

            <div className="space-y-3">
              {/* Quantities */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Quantity Offer 1
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_offer_1 || 1}
                    onChange={(e) => setFormData({ ...formData, quantity_offer_1: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Number of pieces in offer 1 (default: 1)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Quantity Offer 2
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_offer_2 || 2}
                    onChange={(e) => setFormData({ ...formData, quantity_offer_2: parseInt(e.target.value) || 2 })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="2"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Number of pieces in offer 2 (default: 2)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Quantity Offer 3
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_offer_3 || 3}
                    onChange={(e) => setFormData({ ...formData, quantity_offer_3: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="3"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Number of pieces in offer 3 (default: 3)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Shipping */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Pricing & Shipping
            </h2>

            <div className="space-y-3">
              {/* SRP */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  SRP (Suggested Retail Price) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.srp}
                  onChange={(e) => setFormData({ ...formData, srp: parseFloat(e.target.value) || 0 })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  This will be the price the customers will see as the normal, undiscounted one. (The one that will be striked out like this.)
                </p>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Price1 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_1}
                    onChange={(e) => setFormData({ ...formData, price_1: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    The price for purchasing one piece.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Price2 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_2}
                    onChange={(e) => setFormData({ ...formData, price_2: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    The price for purchasing two pieces.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Price3 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_3}
                    onChange={(e) => setFormData({ ...formData, price_3: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    The price for purchasing three pieces.
                  </p>
                </div>
              </div>

              {/* Shipping Price */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Shipping Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shipping_price}
                  onChange={(e) => setFormData({ ...formData, shipping_price: parseFloat(e.target.value) || 0 })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  The price the customer will pay for shipping. (not the internal shipping price)
                </p>
              </div>

              {/* Post Purchase Status */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="postPurchaseStatus"
                  checked={formData.post_purchase_status}
                  onChange={(e) => setFormData({ ...formData, post_purchase_status: e.target.checked })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded"
                />
                <label htmlFor="postPurchaseStatus" className="ml-2">
                  <span className="block text-xs font-medium text-zinc-300">
                    Post Purchase Status
                  </span>
                  <span className="block text-xs text-zinc-500">
                    This is required in order to enable the post-purchase offers (inactive for now)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Conversion Tracking */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Conversion Tracking
            </h2>

            <div className="space-y-3">
              {/* Facebook Pixel ID */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  value={formData.fb_pixel_id || ""}
                  onChange={(e) => setFormData({ ...formData, fb_pixel_id: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Leave empty to use store-level settings"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Enter your Facebook Pixel ID for tracking.
                </p>
              </div>

              {/* Conversion API Token */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Conversion API Token
                </label>
                <input
                  type="text"
                  value={formData.fb_conversion_token || ""}
                  onChange={(e) => setFormData({ ...formData, fb_conversion_token: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Leave empty to use store-level settings"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Enter your Facebook Conversion API Token.
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
                    Client-side Tracking Enabled (Facebook Pixel)
                  </span>
                  <span className="block text-xs text-zinc-500">
                    This automatically installs the Facebook Pixel code to your website.
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
                    Server-side Tracking Enabled (Conversion API)
                  </span>
                  <span className="block text-xs text-zinc-500">
                    Enable server-side conversion tracking.
                  </span>
                </label>
              </div>

              {/* Custom Event Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Custom Event Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.custom_event_name || ""}
                  onChange={(e) => setFormData({ ...formData, custom_event_name: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Custom Event Name (Optional)"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  The value entered in Custom Event Name will be added to the name of the events sent to Meta.
                  For example, if the Custom Event Name is MyProduct, then the events will be sent as PurchaseMyProduct.
                </p>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="p-4 border-b border-zinc-700/50">
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
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
                className="px-4 py-2 border border-zinc-700 text-zinc-400 rounded-md hover:bg-zinc-700 transition-colors text-sm"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  formData?.status === "published"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {formData?.status === "published" ? "Set as Draft" : "Publish"}
              </button>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
