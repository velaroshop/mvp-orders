"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  sku?: string;
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
    postPurchaseStatus: false,
    // Conversion Tracking
    fbPixelId: "",
    fbConversionToken: "",
    clientSideTracking: false,
    serverSideTracking: false,
    customEventName: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchStores();
  }, []);

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

      setMessage({ type: "success", text: "Landing page created successfully!" });
      
      setTimeout(() => {
        router.push("/admin/landing-pages");
      }, 1000);
    } catch (error) {
      console.error("Error creating landing page:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create landing page",
      });
    } finally {
      setIsSaving(false);
    }
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
        <h1 className="text-2xl font-bold text-white">Create Landing Page</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Create a new landing page for your product
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
                            setFormData({ ...formData, productId: product.id });
                            setProductSearch("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-900/50 text-sm text-white"
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
                {formData.productId && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Selected: {products.find(p => p.id === formData.productId)?.name}
                  </p>
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
                            setFormData({ ...formData, storeId: store.id });
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
                {formData.storeId && (
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded-md">
                    <p className="text-sm text-white font-medium">
                      {stores.find(s => s.id === formData.storeId)?.url}
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
                  value={formData.thankYouPath}
                  onChange={(e) => setFormData({ ...formData, thankYouPath: e.target.value })}
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Offer Heading 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.offerHeading1}
                    onChange={(e) => setFormData({ ...formData, offerHeading1: e.target.value })}
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
                    value={formData.offerHeading2}
                    onChange={(e) => setFormData({ ...formData, offerHeading2: e.target.value })}
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
                    value={formData.offerHeading3}
                    onChange={(e) => setFormData({ ...formData, offerHeading3: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                    placeholder="Super ofertă"
                    required
                  />
                </div>
              </div>

              {/* Numerals */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Numeral 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.numeral1}
                    onChange={(e) => setFormData({ ...formData, numeral1: e.target.value })}
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
                    value={formData.numeral2}
                    onChange={(e) => setFormData({ ...formData, numeral2: e.target.value })}
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
                    value={formData.numeral3}
                    onChange={(e) => setFormData({ ...formData, numeral3: e.target.value })}
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
                  value={formData.orderButtonText}
                  onChange={(e) => setFormData({ ...formData, orderButtonText: e.target.value })}
                  className="w-full max-w-md px-3 text-sm py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Plasează comanda!"
                  required
                />
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
                  onChange={(e) => setFormData({ ...formData, srp: e.target.value })}
                  className="w-full max-w-md px-3 text-sm py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  This will be the price the customers will see as the normal, undiscounted one. (The one that will be striked out like this.)
                </p>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Price1 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price1}
                    onChange={(e) => setFormData({ ...formData, price1: e.target.value })}
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
                    value={formData.price2}
                    onChange={(e) => setFormData({ ...formData, price2: e.target.value })}
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
                    value={formData.price3}
                    onChange={(e) => setFormData({ ...formData, price3: e.target.value })}
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
                  value={formData.shippingPrice}
                  onChange={(e) => setFormData({ ...formData, shippingPrice: e.target.value })}
                  className="w-full max-w-md px-3 text-sm py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
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
                  checked={false}
                  onChange={(e) => setFormData({ ...formData, postPurchaseStatus: e.target.checked })}
                  disabled={true}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="postPurchaseStatus" className="ml-2">
                  <span className="block text-xs font-medium text-zinc-300">
                    Post Purchase Status
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
                  value={formData.fbPixelId}
                  onChange={(e) => setFormData({ ...formData, fbPixelId: e.target.value })}
                  className="w-full max-w-md px-3 text-sm py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
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
                  value={formData.fbConversionToken}
                  onChange={(e) => setFormData({ ...formData, fbConversionToken: e.target.value })}
                  className="w-full max-w-md px-3 text-sm py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
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
                  checked={formData.clientSideTracking}
                  onChange={(e) => setFormData({ ...formData, clientSideTracking: e.target.checked })}
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
                  checked={formData.serverSideTracking}
                  onChange={(e) => setFormData({ ...formData, serverSideTracking: e.target.checked })}
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
                  value={formData.customEventName}
                  onChange={(e) => setFormData({ ...formData, customEventName: e.target.value })}
                  className="w-full max-w-md px-3 text-sm py-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
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
          <div className="p-4 bg-zinc-900/50 flex justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-zinc-700 text-zinc-500 rounded-md hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Creating..." : "Create Landing Page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
