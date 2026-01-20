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

interface LandingPage {
  id: string;
  slug: string;
  title?: string;
  name?: string;
}

interface UpsellFormData {
  landing_page_id: string;
  type: "presale" | "postsale";
  product_id: string;
  title: string;
  description: string;
  quantity: number;
  srp: string;
  price: string;
  media_url: string;
  active: boolean;
  display_order: number;
}

export default function AddUpsellPage() {
  const router = useRouter();
  const params = useParams();
  const landingPageId = params.id as string;

  // Get type from URL query parameter
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const typeParam = searchParams?.get("type");
  const initialType = (typeParam === "presale" || typeParam === "postsale") ? typeParam : "presale";

  const [products, setProducts] = useState<Product[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingLandingPages, setIsLoadingLandingPages] = useState(true);

  const [formData, setFormData] = useState<UpsellFormData>({
    landing_page_id: landingPageId || "",
    type: initialType,
    product_id: "",
    title: "",
    description: "",
    quantity: 1,
    srp: "",
    price: "",
    media_url: "",
    active: true,
    display_order: 0,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [landingPageSearch, setLandingPageSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showLandingPageDropdown, setShowLandingPageDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProducts();
    fetchLandingPages();
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

  async function fetchLandingPages() {
    try {
      setIsLoadingLandingPages(true);
      const response = await fetch("/api/landing-pages");
      if (response.ok) {
        const data = await response.json();
        setLandingPages(data.landingPages || []);

        // Set initial landing page search if ID is provided
        if (landingPageId) {
          const currentPage = data.landingPages?.find((p: LandingPage) => p.id === landingPageId);
          if (currentPage) {
            setLandingPageSearch(currentPage.name || currentPage.slug);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching landing pages:", err);
    } finally {
      setIsLoadingLandingPages(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.landing_page_id) {
      newErrors.landing_page_id = "Landing page is required";
    }
    if (!formData.product_id) {
      newErrors.product_id = "Product is required";
    }
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (formData.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    }
    if (!formData.srp || parseFloat(formData.srp) < 0) {
      newErrors.srp = "SRP is required and must be positive";
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = "Price is required and must be positive";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      setMessage({ type: "error", text: "Please fix the errors before submitting" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/upsells", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          landing_page_id: formData.landing_page_id,
          type: formData.type,
          product_id: formData.product_id,
          title: formData.title,
          description: formData.description || null,
          quantity: parseInt(formData.quantity.toString()),
          srp: parseFloat(formData.srp),
          price: parseFloat(formData.price),
          media_url: formData.media_url || null,
          active: formData.active,
          display_order: parseInt(formData.display_order.toString()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create upsell");
      }

      setMessage({ type: "success", text: "Upsell created successfully!" });

      setTimeout(() => {
        router.push("/admin/landing-pages");
      }, 1000);
    } catch (error) {
      console.error("Error creating upsell:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create upsell",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const filteredProducts = products.filter(p => {
    // Only show active products
    if (p.status !== "active") return false;

    // Filter by search
    return p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
  });

  const filteredLandingPages = landingPages.filter(lp =>
    (lp.name && lp.name.toLowerCase().includes(landingPageSearch.toLowerCase())) ||
    lp.slug.toLowerCase().includes(landingPageSearch.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === formData.product_id);
  const selectedLandingPage = landingPages.find(lp => lp.id === formData.landing_page_id);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Add Upsell</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Create a new presale or postsale upsell
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border ${
          message.type === "success"
            ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
            : "bg-red-900/20 border-red-800 text-red-400"
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50">
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Basic Information
            </h2>

            <div className="space-y-3">
              {/* Landing Page - Read-only display */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Landing Page
                </label>
                {selectedLandingPage ? (
                  <div className="p-3 bg-emerald-600/10 border border-emerald-600/30 rounded-md">
                    <p className="text-sm text-emerald-400 font-medium">
                      {selectedLandingPage.name || selectedLandingPage.slug}
                    </p>
                    <p className="text-xs text-emerald-500/70 mt-1">/{selectedLandingPage.slug}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                    <p className="text-sm text-zinc-400 italic">Loading landing page...</p>
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "presale" | "postsale" })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm"
                >
                  <option value="presale">Pre-sale</option>
                  <option value="postsale">Post-sale</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Pre-sale upsells appear before the main offer, post-sale appear after
                </p>
              </div>

              {/* Product */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Product *
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
                    placeholder="Search for product..."
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm ${
                      errors.product_id ? "border-red-500 bg-red-950/20" : "border-zinc-700"
                    }`}
                  />
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg overflow-auto" style={{ maxHeight: '12.5rem' }}>
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, product_id: product.id });
                            setProductSearch(product.name);
                            setShowProductDropdown(false);
                            setErrors({ ...errors, product_id: "" });
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
                      <p className="text-xs text-zinc-400 italic">No active products found</p>
                    </div>
                  )}
                </div>
                {formData.product_id && selectedProduct && (
                  <div className="mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                    <p className="text-sm text-white font-medium">{selectedProduct.name}</p>
                    {selectedProduct.sku && (
                      <p className="text-xs text-zinc-400 mt-1">SKU: {selectedProduct.sku}</p>
                    )}
                  </div>
                )}
                {errors.product_id && (
                  <p className="text-xs text-red-400 mt-1">{errors.product_id}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    setErrors({ ...errors, title: "" });
                  }}
                  placeholder="Enter upsell title"
                  className={`w-full px-3 py-2 bg-zinc-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm ${
                    errors.title ? "border-red-500 bg-red-950/20" : "border-zinc-700"
                  }`}
                />
                {errors.title && (
                  <p className="text-xs text-red-400 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description - Optional for presale, visible for postsale */}
              {formData.type === "postsale" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter upsell description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm"
                  />
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => {
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 });
                    setErrors({ ...errors, quantity: "" });
                  }}
                  className={`w-full px-3 py-2 bg-zinc-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm ${
                    errors.quantity ? "border-red-500 bg-red-950/20" : "border-zinc-700"
                  }`}
                />
                {errors.quantity && (
                  <p className="text-xs text-red-400 mt-1">{errors.quantity}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Pricing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* SRP */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  SRP (Suggested Retail Price) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.srp}
                  onChange={(e) => {
                    setFormData({ ...formData, srp: e.target.value });
                    setErrors({ ...errors, srp: "" });
                  }}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 bg-zinc-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm ${
                    errors.srp ? "border-red-500 bg-red-950/20" : "border-zinc-700"
                  }`}
                />
                {errors.srp && (
                  <p className="text-xs text-red-400 mt-1">{errors.srp}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Price (Sale Price) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => {
                    setFormData({ ...formData, price: e.target.value });
                    setErrors({ ...errors, price: "" });
                  }}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 bg-zinc-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm ${
                    errors.price ? "border-red-500 bg-red-950/20" : "border-zinc-700"
                  }`}
                />
                {errors.price && (
                  <p className="text-xs text-red-400 mt-1">{errors.price}</p>
                )}
              </div>
            </div>
          </div>

          {/* Media & Settings */}
          <div className="p-4 border-b border-zinc-700/50">
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Media & Settings
            </h2>

            <div className="space-y-3">
              {/* Media URL */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Media URL
                </label>
                <input
                  type="text"
                  value={formData.media_url}
                  onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Supported formats: JPG, PNG, WEBP. Use small file sizes for faster loading.
                </p>
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>

              {/* Active */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 bg-zinc-800 border border-zinc-700 rounded focus:ring-2 focus:ring-emerald-500 text-emerald-500"
                />
                <label htmlFor="active" className="ml-2 text-sm text-zinc-300">
                  Active
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-md font-medium text-sm transition-colors"
            >
              {isSaving ? "Creating..." : "Create Upsell"}
            </button>
            <Link
              href="/admin/landing-pages"
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md font-medium text-sm transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
