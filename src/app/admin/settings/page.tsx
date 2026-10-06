"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [helpshipClientId, setHelpshipClientId] = useState("");
  const [helpshipClientSecret, setHelpshipClientSecret] = useState("");
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  const [metaTestMode, setMetaTestMode] = useState(false);
  const [metaTestEventCode, setMetaTestEventCode] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isSavingMetaTest, setIsSavingMetaTest] = useState(false);
  const [isSavingVat, setIsSavingVat] = useState(false);
  const [vatMessage, setVatMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingVapi, setIsSavingVapi] = useState(false);
  const [vapiMessage, setVapiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(false);
  const [credentialsMessage, setCredentialsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [metaTestMessage, setMetaTestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [validationStatus, setValidationStatus] = useState<"valid" | "invalid" | null>(null);
  // Meta Ads Dashboard
  const [metaAdsToken, setMetaAdsToken] = useState("");
  const [hasExistingMetaAdsToken, setHasExistingMetaAdsToken] = useState(false);
  const [metaAdsAccountId, setMetaAdsAccountId] = useState("");
  const [metaAdsAccounts, setMetaAdsAccounts] = useState<Array<{ id: string; name: string; currency: string }>>([]);
  const [isTestingMetaAds, setIsTestingMetaAds] = useState(false);
  const [isSavingMetaAds, setIsSavingMetaAds] = useState(false);
  const [metaAdsMessage, setMetaAdsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [metaAdsTokenExpiresAt, setMetaAdsTokenExpiresAt] = useState<string | null>(null);
  // Duplicate check days
  const [duplicateCheckDays, setDuplicateCheckDays] = useState(14);
  const [isSavingDuplicateDays, setIsSavingDuplicateDays] = useState(false);
  const [duplicateDaysMessage, setDuplicateDaysMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Failed to load settings");
        const data = await response.json();
        setHelpshipClientId(data.settings.helpship_client_id || "");
        setMetaTestMode(data.settings.meta_test_mode || false);
        setMetaTestEventCode(data.settings.meta_test_event_code || "");
        setVatEnabled(data.settings.vat_enabled ?? true);
        setHasExistingSecret(!!data.settings.helpship_client_secret);
        setHelpshipClientSecret("");
        setHasExistingMetaAdsToken(!!data.settings.meta_ads_access_token);
        setMetaAdsToken("");
        setMetaAdsAccountId(data.settings.meta_ads_account_id || "");
        setMetaAdsTokenExpiresAt(data.settings.meta_ads_token_expires_at || null);
      } catch (error) {
        console.error("Error loading settings:", error);
        setCredentialsMessage({ type: "error", text: "Failed to load settings" });
      }
    }
    async function loadDuplicateDays() {
      try {
        const response = await fetch("/api/settings/duplicate-days");
        if (response.ok) {
          const data = await response.json();
          setDuplicateCheckDays(data.duplicate_check_days || 14);
        }
      } catch (error) {
        console.error("Error loading duplicate days:", error);
      }
    }
    loadSettings();
    loadDuplicateDays();
  }, []);

  async function handleValidateCredentials() {
    setIsValidatingCredentials(true);
    setCredentialsMessage(null);
    setValidationStatus(null);
    try {
      if (!helpshipClientId || !helpshipClientSecret) {
        throw new Error("Both Client ID and Client Secret are required");
      }
      const response = await fetch("/api/settings/validate-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpshipClientId, helpshipClientSecret }),
      });
      const data = await response.json();
      if (data.valid) {
        setValidationStatus("valid");
        setCredentialsMessage({ type: "success", text: "Credențiale valide! ✓ Le poți salva acum." });
      } else {
        setValidationStatus("invalid");
        setCredentialsMessage({ type: "error", text: `Credențiale invalide: ${data.error}` });
      }
    } catch (error) {
      setValidationStatus("invalid");
      setCredentialsMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to validate credentials" });
    } finally {
      setIsValidatingCredentials(false);
    }
  }

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingCredentials(true);
    setCredentialsMessage(null);
    try {
      if (!helpshipClientId || !helpshipClientSecret) {
        throw new Error("Both Client ID and Client Secret are required");
      }
      setIsValidatingCredentials(true);
      const validateResponse = await fetch("/api/settings/validate-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpshipClientId, helpshipClientSecret }),
      });
      const validateData = await validateResponse.json();
      setIsValidatingCredentials(false);
      if (!validateData.valid) {
        setValidationStatus("invalid");
        throw new Error(`Credențiale invalide: ${validateData.error}`);
      }
      setValidationStatus("valid");
      const response = await fetch("/api/settings/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpshipClientId, helpshipClientSecret }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save credentials");
      }
      setCredentialsMessage({ type: "success", text: "Credențiale Helpship validate și salvate cu succes! ✓" });
      setHasExistingSecret(true);
      setHelpshipClientSecret("");
    } catch (error) {
      setCredentialsMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save credentials" });
    } finally {
      setIsSavingCredentials(false);
      setIsValidatingCredentials(false);
    }
  }

  async function handleSaveMetaTest(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingMetaTest(true);
    setMetaTestMessage(null);
    try {
      const response = await fetch("/api/settings/meta-test", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaTestMode, metaTestEventCode }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save Meta test settings");
      }
      setMetaTestMessage({ type: "success", text: "Setările Meta Test Mode au fost salvate!" });
    } catch (error) {
      setMetaTestMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save Meta test settings" });
    } finally {
      setIsSavingMetaTest(false);
    }
  }

  function MessageBox({ msg }: { msg: { type: "success" | "error"; text: string } | null }) {
    if (!msg) return null;
    return (
      <div className={`card p-3 text-sm ${msg.type === "success" ? "border-green-700/60 text-green-400" : "border-red-800/60 text-red-400"}`}>
        {msg.text}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Setări</h1>
        <p className="page-subtitle">Configurează integrările și preferințele aplicației</p>
      </div>

      {/* Helpship Credentials */}
      <form onSubmit={handleSaveCredentials}>
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Helpship WMS</h2>

          <div>
            <label className="label">Client ID</label>
            <input
              type="text"
              autoComplete="off"
              value={helpshipClientId}
              onChange={(e) => { setHelpshipClientId(e.target.value); setValidationStatus(null); }}
              className="input max-w-md"
              placeholder="Enter client ID"
              required
            />
          </div>

          <div>
            <label className="label">
              Client Secret
              {hasExistingSecret && <span className="ml-2 text-xs text-green-400 font-normal">(Configurat ✓)</span>}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={helpshipClientSecret}
              onChange={(e) => { setHelpshipClientSecret(e.target.value); setValidationStatus(null); }}
              className="input max-w-md"
              placeholder={hasExistingSecret ? "Introdu secretul nou pentru a actualiza" : "Enter client secret"}
              required
            />
            <p className="text-xs text-faint mt-1">OAuth2 client secret pentru autentificarea în API-ul Helpship</p>
          </div>

          {validationStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              validationStatus === "valid"
                ? "bg-green-900/20 border border-green-700/60 text-green-400"
                : "bg-red-900/20 border border-red-800/60 text-red-400"
            }`}>
              {validationStatus === "valid" ? (
                <><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Credențiale verificate cu succes</>
              ) : (
                <><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Credențiale invalide</>
              )}
            </div>
          )}

          <MessageBox msg={credentialsMessage} />

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleValidateCredentials}
              disabled={isValidatingCredentials || !helpshipClientId || !helpshipClientSecret}
              className="btn btn-secondary"
            >
              {isValidatingCredentials ? "Se testează..." : "Testează conexiunea"}
            </button>
            <button
              type="submit"
              disabled={isSavingCredentials || isValidatingCredentials}
              className="btn btn-primary"
            >
              {isSavingCredentials ? (isValidatingCredentials ? "Se validează..." : "Se salvează...") : "Salvează credențialele"}
            </button>
          </div>
        </div>
      </form>

      {/* Meta Conversion Test Mode */}
      <form onSubmit={handleSaveMetaTest}>
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Meta Conversion Tracking — Test Mode</h2>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={metaTestMode}
              onChange={(e) => setMetaTestMode(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block text-sm font-medium text-white">Activează Test Mode</span>
              <span className="block text-xs text-faint mt-0.5">
                Când este activ, toate evenimentele Meta CAPI vor fi trimise în modul test. Util pentru validare în Meta Events Manager înainte de lansare.
              </span>
            </span>
          </label>

          {metaTestMode && (
            <div>
              <label className="label">Test Event Code</label>
              <input
                type="text"
                value={metaTestEventCode}
                onChange={(e) => setMetaTestEventCode(e.target.value)}
                placeholder="TEST12345"
                className="input max-w-xs"
              />
              <p className="text-xs text-faint mt-1">
                Codul din Meta Events Manager → Test Events.
              </p>
            </div>
          )}

          <div className="card p-3 border-blue-700/40 text-blue-300 text-xs">
            Test mode se aplică global pe toate landing page-urile. Dezactivează-l după ce ai validat tracking-ul.
          </div>

          <MessageBox msg={metaTestMessage} />

          <div className="flex justify-end">
            <button type="submit" disabled={isSavingMetaTest} className="btn btn-primary">
              {isSavingMetaTest ? "Se salvează..." : "Salvează"}
            </button>
          </div>
        </div>
      </form>

      {/* VAT Settings */}
      <form onSubmit={async (e) => {
        e.preventDefault();
        setIsSavingVat(true);
        setVatMessage(null);
        try {
          const response = await fetch("/api/settings/vat", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vatEnabled }),
          });
          if (!response.ok) throw new Error("Failed to save VAT settings");
          setVatMessage({ type: "success", text: "Setările TVA au fost salvate." });
        } catch (error) {
          setVatMessage({ type: "error", text: "Eroare la salvarea setărilor TVA." });
        } finally {
          setIsSavingVat(false);
        }
      }}>
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Setări TVA</h2>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={(e) => setVatEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block text-sm font-medium text-white">Organizația este plătitoare de TVA</span>
              <span className="block text-xs text-faint mt-0.5">
                Comenzile trimise către Helpship vor include TVA de 21%.
              </span>
            </span>
          </label>

          <div>
            <label className="label">Cotă TVA (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={21}
                disabled
                className="input w-20 opacity-50 cursor-not-allowed"
              />
              <span className="text-xs text-faint">Cotă standard pentru România (fixă)</span>
            </div>
          </div>

          <div className={`card p-3 text-xs ${vatEnabled ? "border-green-700/60 text-green-400" : "border-zinc-700/60 text-muted"}`}>
            {vatEnabled
              ? "Comenzile trimise către Helpship vor include TVA de 21% pe produse și livrare."
              : "Comenzile trimise către Helpship NU vor include TVA (0%)."}
          </div>

          <MessageBox msg={vatMessage} />

          <div className="flex justify-end">
            <button type="submit" disabled={isSavingVat} className="btn btn-primary">
              {isSavingVat ? "Se salvează..." : "Salvează"}
            </button>
          </div>
        </div>
      </form>

      {/* Duplicate Order Detection */}
      <form onSubmit={async (e) => {
        e.preventDefault();
        setIsSavingDuplicateDays(true);
        setDuplicateDaysMessage(null);
        try {
          const response = await fetch("/api/settings/duplicate-days", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ duplicate_check_days: duplicateCheckDays }),
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to save");
          }
          setDuplicateDaysMessage({ type: "success", text: "Setarea a fost salvată." });
        } catch (error) {
          setDuplicateDaysMessage({ type: "error", text: error instanceof Error ? error.message : "Eroare la salvare." });
        } finally {
          setIsSavingDuplicateDays(false);
        }
      }}>
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Detectare comenzi duplicate</h2>

          <div>
            <label className="label">Număr de zile pentru verificare duplicate</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={365}
                value={duplicateCheckDays}
                onChange={(e) => setDuplicateCheckDays(parseInt(e.target.value) || 14)}
                className="input w-24"
                required
              />
              <span className="text-sm text-muted">zile</span>
            </div>
            <p className="text-xs text-faint mt-1">
              La confirmarea unei comenzi, sistemul verifică dacă același client a mai plasat o comandă în ultimele X zile.
            </p>
          </div>

          <MessageBox msg={duplicateDaysMessage} />

          <div className="flex justify-end">
            <button type="submit" disabled={isSavingDuplicateDays} className="btn btn-primary">
              {isSavingDuplicateDays ? "Se salvează..." : "Salvează"}
            </button>
          </div>
        </div>
      </form>

      {/* Meta Ads Dashboard */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="section-title">Meta Ads Dashboard</h2>
          <p className="text-xs text-faint mt-1">Conectează contul Meta Ads pentru a vizualiza performanța campaniilor</p>
        </div>

        <div>
          <label className="label">
            Token
            {hasExistingMetaAdsToken && <span className="ml-2 text-xs text-green-400 font-normal">(Configurat ✓)</span>}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={metaAdsToken}
            onChange={(e) => { setMetaAdsToken(e.target.value); setMetaAdsAccounts([]); setMetaAdsMessage(null); }}
            className="input max-w-md"
            placeholder={hasExistingMetaAdsToken ? "Introdu token nou pentru a actualiza" : "Enter Meta access token"}
          />
          {metaAdsTokenExpiresAt && (() => {
            const diffMs = new Date(metaAdsTokenExpiresAt).getTime() - Date.now();
            const daysLeft = Math.floor(diffMs / 86400000);
            const isExpired = diffMs <= 0;
            const isWarning = daysLeft <= 7;
            return (
              <span className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md text-xs border ${
                isExpired ? "bg-red-900/20 border-red-800/60 text-red-400" :
                isWarning ? "bg-orange-900/20 border-orange-700/60 text-orange-400" :
                "bg-zinc-800 border-zinc-700 text-muted"
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isExpired ? "Token expirat" : `Token expiră în ${daysLeft} zile (${new Date(metaAdsTokenExpiresAt).toLocaleDateString("ro-RO")})`}
              </span>
            );
          })()}
        </div>

        <div>
          <button
            type="button"
            onClick={async () => {
              setIsTestingMetaAds(true);
              setMetaAdsMessage(null);
              setMetaAdsAccounts([]);
              try {
                const tokenParam = metaAdsToken ? `?token=${encodeURIComponent(metaAdsToken)}` : "";
                const res = await fetch(`/api/ads/accounts${tokenParam}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to connect");
                if (!data.accounts || data.accounts.length === 0) throw new Error("No ad accounts found for this token");
                setMetaAdsAccounts(data.accounts);
                if (!metaAdsAccountId && data.accounts.length > 0) setMetaAdsAccountId(data.accounts[0].id);
                setMetaAdsMessage({ type: "success", text: `${data.accounts.length} cont(uri) de anunțuri găsite!` });
              } catch (error) {
                setMetaAdsMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to test connection" });
              } finally {
                setIsTestingMetaAds(false);
              }
            }}
            disabled={isTestingMetaAds || (!metaAdsToken && !hasExistingMetaAdsToken)}
            className="btn btn-secondary"
          >
            {isTestingMetaAds ? "Se testează..." : "Testează conexiunea"}
          </button>
        </div>

        {metaAdsAccounts.length > 0 && (
          <div>
            <label className="label">Ad Account</label>
            <select
              value={metaAdsAccountId}
              onChange={(e) => setMetaAdsAccountId(e.target.value)}
              className="input max-w-md"
            >
              {metaAdsAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.id}) - {acc.currency}
                </option>
              ))}
            </select>
          </div>
        )}

        {metaAdsAccountId && metaAdsAccounts.length === 0 && (
          <div>
            <label className="label">Cont selectat</label>
            <p className="text-sm text-muted">{metaAdsAccountId}</p>
          </div>
        )}

        <MessageBox msg={metaAdsMessage} />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={async () => {
              setIsSavingMetaAds(true);
              setMetaAdsMessage(null);
              try {
                const body: Record<string, string> = {};
                if (metaAdsToken) body.metaAdsAccessToken = metaAdsToken;
                if (metaAdsAccountId) body.metaAdsAccountId = metaAdsAccountId;
                if (Object.keys(body).length === 0) throw new Error("Introdu un token sau selectează un cont");
                const res = await fetch("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "Failed to save");
                }
                setMetaAdsMessage({ type: "success", text: "Setările Meta Ads au fost salvate!" });
                if (metaAdsToken) {
                  setHasExistingMetaAdsToken(true);
                  setMetaAdsToken("");
                  const settingsRes = await fetch("/api/settings");
                  if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    setMetaAdsTokenExpiresAt(settingsData.settings.meta_ads_token_expires_at || null);
                  }
                }
              } catch (error) {
                setMetaAdsMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save" });
              } finally {
                setIsSavingMetaAds(false);
              }
            }}
            disabled={isSavingMetaAds}
            className="btn btn-primary"
          >
            {isSavingMetaAds ? "Se salvează..." : "Salvează"}
          </button>
        </div>
      </div>

      {/* Security Note */}
      <div className="card p-4 border-blue-700/40 text-blue-300 text-xs">
        <strong className="font-semibold">Notă de securitate:</strong> Client Secret-ul este criptat și stocat în siguranță. Din motive de securitate, secretul nu este afișat după salvare — trebuie reintrodus doar dacă dorești să îl actualizezi.
      </div>
    </div>
  );
}
