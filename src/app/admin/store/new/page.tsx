"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewStorePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    url: "",
    orderSeries: "VLR",
    orderEmail: "",
    primaryColor: "#FF6B00",
    accentColor: "#00A854",
    backgroundColor: "#2C3E50",
    textOnDarkColor: "#FFFFFF",
    duplicateOrderDays: 14,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  function isValidEmail(email: string): boolean {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleEmailChange(email: string) {
    setFormData({ ...formData, orderEmail: email });
    setEmailError(email && !isValidEmail(email) ? "Adresa de email nu este validă" : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formData.orderEmail && !isValidEmail(formData.orderEmail)) {
      setEmailError("Adresa de email nu este validă");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create store");
      setMessage({ type: "success", text: "Magazin creat cu succes!" });
      setTimeout(() => router.push("/admin/store"), 1000);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to create store" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Magazin nou</h1>
        <p className="page-subtitle">Configurează detaliile și personalizările magazinului</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Store Details */}
        <div className="card p-6 space-y-5">
          <h2 className="section-title">Detalii magazin</h2>

          {/* URL */}
          <div>
            <label className="label">URL *</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="input"
              placeholder="ex: yourstore.com"
              required
            />
            <p className="text-xs text-faint mt-1">URL-ul unic pentru acest magazin (ex: yoursite.com)</p>
          </div>

          {/* Order Series */}
          <div>
            <label className="label">Serie comenzi *</label>
            <input
              type="text"
              value={formData.orderSeries}
              onChange={(e) => setFormData({ ...formData, orderSeries: e.target.value })}
              className="input max-w-xs"
              placeholder="ex: VLR"
              required
            />
            <p className="text-xs text-faint mt-1">Prefixul folosit la numerotarea comenzilor (ex: ECM).</p>
          </div>

          {/* Order Email */}
          <div>
            <label className="label">E-mail comenzi</label>
            <input
              type="email"
              value={formData.orderEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`input max-w-sm ${
                emailError
                  ? "border-red-500 focus:border-red-500"
                  : formData.orderEmail && !emailError
                  ? "border-green-600"
                  : ""
              }`}
              placeholder="ex: comenzi@store.com"
            />
            {emailError ? (
              <p className="text-xs text-red-400 mt-1">{emailError}</p>
            ) : (
              <p className="text-xs text-faint mt-1">Adresa folosită la trimiterea comenzilor în Helpship.</p>
            )}
          </div>

          {/* Duplicate order days */}
          <div>
            <label className="label">Zile detectare comenzi duplicate *</label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.duplicateOrderDays}
              onChange={(e) => setFormData({ ...formData, duplicateOrderDays: parseInt(e.target.value) || 14 })}
              className="input max-w-xs"
              placeholder="14"
              required
            />
            <p className="text-xs text-faint mt-1">
              Numărul de zile înapoi pentru detectarea comenzilor duplicate de la același client (implicit: 14 zile).
            </p>
          </div>
        </div>

        {/* Color Scheme */}
        <div className="card p-6 space-y-5">
          <h2 className="section-title">Schema de culori</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { key: "primaryColor",    label: "Culoare primară (Buton Submit)" },
              { key: "accentColor",     label: "Culoare accent (Badge, Iconițe, Prețuri)" },
              { key: "backgroundColor", label: "Culoare fundal (Header & Rezumat)" },
              { key: "textOnDarkColor", label: "Text pe fundal închis (Header & Rezumat)" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData[key as keyof typeof formData] as string}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="h-9 w-14 rounded border border-zinc-600 cursor-pointer bg-zinc-900 p-0.5"
                  />
                  <input
                    type="text"
                    value={formData[key as keyof typeof formData] as string}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="input flex-1 font-mono text-sm"
                    placeholder="#000000"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-faint">
            Modificările pot dura câteva minute să se aplice. Refresh cu CMD/CTRL + SHIFT + R după salvare.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`card p-4 text-sm ${
            message.type === "success"
              ? "border-green-700/60 text-green-400"
              : "border-red-800/60 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.back()} className="btn btn-secondary">
            Anulează
          </button>
          <button
            type="submit"
            disabled={isSaving || !!emailError}
            className="btn btn-primary"
          >
            {isSaving ? "Se creează..." : "Creează magazin"}
          </button>
        </div>
      </form>
    </div>
  );
}
