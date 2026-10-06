"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Zap, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "A apărut o eroare. Te rugăm să încerci din nou.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("A apărut o eroare. Te rugăm să încerci din nou.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-200">
            <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">EMS</h1>
          <p className="text-sm text-slate-500 mt-1">Ecom Made Simple</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">

          {submitted ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mb-4">
                <CheckCircle className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Verifică emailul</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Dacă există un cont pentru <span className="font-medium text-slate-700">{email}</span>,
                vei primi în scurt timp un link de resetare. Verifică și dosarul spam dacă nu îl găsești.
              </p>
              <Link
                href="/auth/signin"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Înapoi la autentificare
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Ai uitat parola?</h2>
              <p className="text-sm text-slate-500 mb-6">
                Introdu emailul tău și îți vom trimite un link de resetare.
              </p>

              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Adresă de email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 text-sm transition-shadow"
                      placeholder="your@email.com"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
                >
                  {isLoading ? "Se trimite..." : "Trimite link de resetare"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/signin"
                  className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Înapoi la autentificare
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
