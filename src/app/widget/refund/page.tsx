"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

interface FormConfig {
  org_name: string;
  form_title: string;
  form_subtitle: string;
  motives: string[];
  terms_url: string;
  primary_color: string;
  logo_url: string;
}

function RefundFormContent() {
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get("org");

  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [error, setError] = useState("");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [motive, setMotive] = useState("");
  const [description, setDescription] = useState("");

  // Force white background and no scroll on body (overrides dark mode from root layout)
  useEffect(() => {
    document.documentElement.style.background = "#ffffff";
    document.body.style.background = "#ffffff";
    document.body.style.color = "#111827";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
  }, []);

  useEffect(() => {
    if (!orgSlug) return;

    async function loadConfig() {
      try {
        const res = await fetch(`/api/widget/refund?org=${orgSlug}`);
        if (!res.ok) throw new Error("Nu s-a putut incarca formularul");
        const data = await res.json();
        setConfig(data);
      } catch {
        setError("Formularul nu este disponibil momentan.");
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [orgSlug]);

  // Auto-resize iframe — notify parent of content height
  useEffect(() => {
    function notifyParent() {
      // Small delay to let DOM settle after render
      requestAnimationFrame(() => {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({ type: "refund-form-resize", height }, "*");
      });
    }

    notifyParent();
    const observer = new MutationObserver(notifyParent);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", notifyParent);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", notifyParent);
    };
  }, [submitted, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/widget/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_slug: orgSlug,
          full_name: fullName,
          email,
          phone,
          order_number: orderNumber,
          product_name: productName,
          motive,
          description,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Eroare la trimiterea cererii");
      }

      setTicketNumber(data.ticket_number);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la trimiterea cererii");
    } finally {
      setSubmitting(false);
    }
  }

  if (!orgSlug) {
    return (
      <div className="p-8 text-center text-gray-500">
        Parametrul &quot;org&quot; lipseste din URL.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center text-red-500">
        {error || "Formularul nu este disponibil."}
      </div>
    );
  }

  const primaryColor = config.primary_color || "#000000";

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
            <svg className="w-8 h-8" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Cererea ta a fost inregistrata!</h2>
          <p className="text-gray-600 mb-4">
            Numarul tichetului tau este:
          </p>
          <p className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
            {ticketNumber}
          </p>
          <p className="text-sm text-gray-500">
            Pastreaza acest numar de tichet. Te vom contacta in cel mai scurt timp
            pentru a finaliza procesul de returnare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      {config.logo_url && (
        <div className="flex justify-center mb-4">
          <img src={config.logo_url} alt="" className="h-12 object-contain" />
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">
        {config.form_title}
      </h1>

      {config.form_subtitle && (
        <p className="text-gray-600 text-center mb-6">{config.form_subtitle}</p>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Nume complet *
          </label>
          <input
            type="text"
            id="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": primaryColor } as any}
            placeholder="Ex: Ion Popescu"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Adresa de email *
          </label>
          <input
            type="email"
            id="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": primaryColor } as any}
            placeholder="Ex: ion@email.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Telefon
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": primaryColor } as any}
            placeholder="Ex: 0722123456"
          />
        </div>

        <div>
          <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Numar comanda
          </label>
          <input
            type="text"
            id="orderNumber"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": primaryColor } as any}
            placeholder="Ex: #12345"
          />
        </div>

        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">
            Produs returnat *
          </label>
          <input
            type="text"
            id="productName"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": primaryColor } as any}
            placeholder="Numele produsului pe care doriti sa il returnati"
          />
        </div>

        <div>
          <label htmlFor="motive" className="block text-sm font-medium text-gray-700 mb-1">
            Motivul returnarii *
          </label>
          <select
            id="motive"
            required
            value={motive}
            onChange={(e) => setMotive(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": primaryColor } as any}
          >
            <option value="">Selecteaza motivul</option>
            {config.motives.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descriere detaliata
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": primaryColor } as any}
            placeholder="Descrie problema in detaliu..."
          />
        </div>

        {config.terms_url && (
          <p className="text-xs text-gray-500">
            Prin trimiterea acestui formular, esti de acord cu{" "}
            <a
              href={config.terms_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: primaryColor }}
            >
              politica de returnare
            </a>
            .
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 text-white font-medium rounded-md transition-opacity disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {submitting ? "Se trimite..." : "Trimite cererea de returnare"}
        </button>
      </form>
    </div>
  );
}

export default function RefundWidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        </div>
      }
    >
      <RefundFormContent />
    </Suspense>
  );
}
