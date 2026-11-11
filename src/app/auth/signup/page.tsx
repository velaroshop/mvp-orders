"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, User, Building2, Zap, Hash, Loader2, BadgeCheck } from "lucide-react";
import TermsModal from "./TermsModal";

type CuiStatus = "idle" | "loading" | "verified" | "invalid" | "not_found" | "inactive" | "duplicate" | "unavailable";

const CUI_ERRORS: Partial<Record<CuiStatus, string>> = {
  invalid: "CUI invalid. Introdu între 2 și 10 cifre.",
  not_found: "CUI-ul nu a fost găsit la ANAF. Verifică numărul introdus.",
  inactive: "Firma figurează inactivă la ANAF, deci nu putem crea contul. Te rugăm să ne contactezi la contact@jupimedia.ro.",
  duplicate: "Există deja un cont pentru această firmă. Dacă ai nevoie de acces, contactează-ne la contact@jupimedia.ro.",
};

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    organizationCui: "",
  });
  const [cuiStatus, setCuiStatus] = useState<CuiStatus>("idle");
  const [isVatPayer, setIsVatPayer] = useState(false); // shows the RO prefix; only the digits are sent
  const currentCui = useRef("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [authorizedRep, setAuthorizedRep] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Checks the CUI at ANAF; on success the company name is filled in and locked
  async function verifyCui(): Promise<{ status: CuiStatus; name: string }> {
    const cui = formData.organizationCui.replace(/\D/g, "");
    if (!cui) {
      setCuiStatus("idle");
      return { status: "idle", name: "" };
    }
    if (cui.length < 2 || cui.length > 10) {
      setCuiStatus("invalid");
      return { status: "invalid", name: "" };
    }

    currentCui.current = cui;
    setCuiStatus("loading");
    let status: CuiStatus = "unavailable";
    let name = "";
    let vatPayer = false;
    try {
      const res = await fetch(`/api/auth/anaf?cui=${cui}`);
      const data = await res.json();
      status = (data.status as CuiStatus) || "unavailable";
      name = data.companyName || "";
      vatPayer = !!data.isVatPayer;
    } catch {
      status = "unavailable";
    }

    // The field changed while the check was running: ignore this answer
    if (currentCui.current !== cui) return { status: "idle", name: "" };

    setCuiStatus(status);
    setIsVatPayer(status === "verified" && vatPayer);
    if (status === "verified") setFormData((f) => ({ ...f, organizationCui: cui, organizationName: name }));
    return { status, name };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Parolele nu coincid");
      return;
    }
    if (formData.password.length < 8) {
      setError("Parola trebuie să aibă cel puțin 8 caractere");
      return;
    }

    let status = cuiStatus;
    let companyName = formData.organizationName;
    if (status === "idle" || status === "invalid") {
      const result = await verifyCui();
      status = result.status;
      if (result.name) companyName = result.name;
    }
    if (status === "loading") {
      setError("Se verifică CUI-ul la ANAF. Încearcă din nou în câteva secunde.");
      return;
    }
    if (status === "idle") {
      setError("CUI-ul firmei este obligatoriu");
      return;
    }
    if (status !== "verified" && status !== "unavailable") {
      setError(CUI_ERRORS[status] || "CUI-ul nu a putut fi verificat");
      return;
    }
    if (!companyName.trim()) {
      setError("Denumirea firmei este obligatorie");
      return;
    }
    if (!termsAccepted) {
      setError("Trebuie să accepți Termenii și Condițiile pentru a continua");
      return;
    }
    if (!authorizedRep) {
      setError("Trebuie să confirmi că ești autorizat să reprezinți firma");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          organizationName: companyName,
          organizationCui: formData.organizationCui.trim(),
          termsAccepted: true,
          authorizedRepresentative: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nu s-a putut crea contul");
        return;
      }

      router.push("/auth/signin?signup=success");
    } catch {
      setError("A apărut o eroare. Te rugăm să încerci din nou.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputCls =
    "w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 text-sm transition-shadow";

  return (
    <>
      {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}

      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-indigo-50 px-4 py-12">
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
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Creează un cont</h2>
            <p className="text-sm text-slate-500 mb-6">
              Platformă destinată exclusiv persoanelor juridice
            </p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nume complet */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nume complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputCls}
                    placeholder="Ion Popescu"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Adresă de email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputCls}
                    placeholder="email@firma.ro"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* CUI */}
              <div>
                <label htmlFor="organizationCui" className="block text-sm font-medium text-slate-700 mb-1.5">
                  CUI firmă
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="organizationCui"
                    type="text"
                    value={formData.organizationCui}
                    onChange={(e) => {
                      currentCui.current = "";
                      // Editing the CUI after a verification clears the name that was filled in from ANAF
                      setFormData({
                        ...formData,
                        organizationCui: e.target.value,
                        organizationName: cuiStatus === "verified" ? "" : formData.organizationName,
                      });
                      setCuiStatus("idle");
                      setIsVatPayer(false);
                    }}
                    onBlur={() => {
                      // Also retried when ANAF was unavailable, in case it is back
                      if ((cuiStatus === "idle" || cuiStatus === "unavailable") && formData.organizationCui.trim()) verifyCui();
                    }}
                    className={isVatPayer ? inputCls.replace("pl-10", "pl-[4.25rem]") : inputCls}
                    placeholder="RO12345678"
                    required
                    disabled={isLoading}
                  />
                  {isVatPayer && (
                    <span
                      className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 select-none"
                      title="Firma este plătitoare de TVA"
                    >
                      RO
                    </span>
                  )}
                  {cuiStatus === "loading" && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
                  )}
                  {cuiStatus === "verified" && (
                    <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  )}
                </div>
                {cuiStatus === "loading" && <p className="text-xs text-slate-500 mt-1.5">Se verifică la ANAF...</p>}
                {cuiStatus === "verified" && (
                  <p className="text-xs text-emerald-600 mt-1.5">
                    Verificat la ANAF. Datele firmei au fost completate.{isVatPayer ? " Firmă plătitoare de TVA (prefixul RO)." : " Firmă neplătitoare de TVA."}
                  </p>
                )}
                {cuiStatus === "unavailable" && (
                  <p className="text-xs text-amber-700 mt-1.5">
                    Nu am putut verifica acum la ANAF. Poți introduce denumirea manual, iar noi o vom verifica la activarea contului.
                  </p>
                )}
                {CUI_ERRORS[cuiStatus] && <p className="text-xs text-red-600 mt-1.5">{CUI_ERRORS[cuiStatus]}</p>}
              </div>

              {/* Denumire firmă */}
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Denumirea firmei
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="organizationName"
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className={`${inputCls} read-only:bg-slate-50 read-only:text-slate-700`}
                    placeholder={cuiStatus === "unavailable" ? "Firma S.R.L." : "Se completează automat după CUI"}
                    readOnly={cuiStatus !== "unavailable"}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Parolă */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Parolă
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 text-sm transition-shadow"
                    placeholder="••••••••"
                    required
                    maxLength={64}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Minimum 8 caractere</p>
              </div>

              {/* Confirmă parola */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmă parola
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 text-sm transition-shadow"
                    placeholder="••••••••"
                    required
                    maxLength={64}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ─── Acceptare Termeni ─────────────────────────────────────── */}
              <div className="border-t border-slate-100 pt-4 space-y-3">

                {/* Checkbox 1 — Termeni și Condiții */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 leading-snug">
                    Am citit și accept{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                    >
                      Termenii și Condițiile
                    </button>
                    {" "}de utilizare a platformei EMS.{" "}
                    <span className="text-red-500">*</span>
                  </span>
                </label>

                {/* Checkbox 2 — Reprezentare firmă */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={authorizedRep}
                    onChange={(e) => setAuthorizedRep(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 leading-snug">
                    Confirm că sunt autorizat să reprezint legal firma indicată și să
                    angajez aceasta în relația contractuală cu Furnizorul.{" "}
                    <span className="text-red-500">*</span>
                  </span>
                </label>

                <p className="text-xs text-slate-400">
                  <span className="text-red-500">*</span> Câmpuri obligatorii.
                  Acceptarea electronică constituie încheierea contractului de abonament.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || cuiStatus === "loading" || !termsAccepted || !authorizedRep}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 mt-2"
              >
                {isLoading ? "Se creează contul..." : "Creează cont"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Ai deja un cont?{" "}
              <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Conectează-te
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
