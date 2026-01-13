/* 
  Very simple version of the public order form.
  Later we will improve the design to match your current landing pages.
*/

"use client";

import { FormEvent, useState } from "react";
import type { OfferCode } from "@/lib/types";

export default function WidgetFormPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Permite doar cifre
    const digitsOnly = value.replace(/\D/g, "");
    
    // Verifică dacă începe cu 0
    if (digitsOnly.length > 0 && digitsOnly[0] !== "0") {
      // Dacă nu începe cu 0, adaugă 0 la început
      const withZero = "0" + digitsOnly;
      // Limitează la 10 cifre
      const limited = withZero.slice(0, 10);
      setPhone(limited);
    } else {
      // Limitează la 10 cifre
      const limited = digitsOnly.slice(0, 10);
      setPhone(limited);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setError(null);

    // Validare număr telefon
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length === 0) {
      setError("Numărul de telefon este obligatoriu.");
      setLoading(false);
      return;
    }
    if (phoneDigits[0] !== "0") {
      setError("Numărul de telefon trebuie să înceapă cu 0.");
      setLoading(false);
      return;
    }
    if (phoneDigits.length !== 10) {
      setError("Numărul de telefon trebuie să aibă exact 10 cifre.");
      setLoading(false);
      return;
    }

    const formData = new FormData(formElement);

    const payload = {
      landingKey: (formData.get("landingKey") as string) || "DEMO_LANDING",
      offerCode: (formData.get("offerCode") as OfferCode) || "offer_1",
      phone: phoneDigits, // Folosim numărul validat
      fullName: (formData.get("fullName") as string) || "",
      county: (formData.get("county") as string) || "",
      city: (formData.get("city") as string) || "",
      address: (formData.get("address") as string) || "",
      upsells: [],
      subtotal: 59,
      shippingCost: 15,
      total: 74,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Nu s-a putut trimite comanda.");
      }

      setSuccess(true);
      formElement.reset();
      setPhone(""); // Resetăm și numărul de telefon
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "A apărut o eroare neașteptată. Încearcă din nou.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-semibold">
          Formular comandă – demo
        </h1>
        <p className="mt-2 text-sm text-zinc-700">
          Aceasta este o versiune foarte simplă a formularului. Ulterior vom
          îmbunătăți designul și îl vom transforma într-un widget integrabil în
          paginile tale de vânzare.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Număr Telefon*
            </label>
            <input
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={handlePhoneChange}
              maxLength={10}
              className="w-full rounded-md border border-zinc-400 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500"
              placeholder="0XXXXXXXXX (10 cifre)"
            />
            {phone && (
              <p className="text-xs text-zinc-600">
                {phone.replace(/\D/g, "").length} / 10 cifre
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nume și Prenume*
            </label>
            <input
              name="fullName"
              required
              className="w-full rounded-md border border-zinc-400 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500"
              placeholder="Introduceți numele dvs. complet"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Județ*</label>
            <input
              name="county"
              required
              className="w-full rounded-md border border-zinc-400 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500"
              placeholder="Introduceți județul"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Localitate, comună sau sat*
            </label>
            <input
              name="city"
              required
              className="w-full rounded-md border border-zinc-400 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500"
              placeholder="Introduceți localitatea / comuna / satul"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Stradă, număr, bloc, scară, ap.*
            </label>
            <input
              name="address"
              required
              className="w-full rounded-md border border-zinc-400 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500"
              placeholder="Introduceți adresa completă"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Alege oferta
            </label>
            <select
              name="offerCode"
              className="w-full rounded-md border border-zinc-400 px-3 py-2 text-sm text-zinc-900"
              defaultValue="offer_1"
            >
              <option value="offer_1">Offer 1</option>
              <option value="offer_2">Offer 2</option>
              <option value="offer_3">Offer 3</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-600">
              Comanda a fost trimisă cu succes!
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Se trimite..." : "Finalizează comanda"}
          </button>
        </form>
      </main>
    </div>
  );
}

