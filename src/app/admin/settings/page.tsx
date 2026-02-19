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
  const [vapiApiKey, setVapiApiKey] = useState("");
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState("");
  const [vapiAssistantId, setVapiAssistantId] = useState("");
  const [hasExistingVapiKey, setHasExistingVapiKey] = useState(false);
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

  useEffect(() => {
    // Load settings from API
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Failed to load settings");

        const data = await response.json();
        setHelpshipClientId(data.settings.helpship_client_id || "");
        setMetaTestMode(data.settings.meta_test_mode || false);
        setMetaTestEventCode(data.settings.meta_test_event_code || "");
        setVatEnabled(data.settings.vat_enabled ?? true);
        // Check if secret exists but don't show it
        setHasExistingSecret(!!data.settings.helpship_client_secret);
        setHelpshipClientSecret("");
        // Vapi settings
        setHasExistingVapiKey(!!data.settings.vapi_api_key);
        setVapiApiKey("");
        setVapiPhoneNumberId(data.settings.vapi_phone_number_id || "");
        setVapiAssistantId(data.settings.vapi_assistant_id || "");
        // Meta Ads settings
        setHasExistingMetaAdsToken(!!data.settings.meta_ads_access_token);
        setMetaAdsToken("");
        setMetaAdsAccountId(data.settings.meta_ads_account_id || "");
      } catch (error) {
        console.error("Error loading settings:", error);
        setCredentialsMessage({ type: "error", text: "Failed to load settings" });
      }
    }

    loadSettings();
  }, []);

  async function handleValidateCredentials() {
    setIsValidatingCredentials(true);
    setCredentialsMessage(null);
    setValidationStatus(null);

    try {
      // Validate that both fields are provided
      if (!helpshipClientId || !helpshipClientSecret) {
        throw new Error("Both Client ID and Client Secret are required");
      }

      const response = await fetch("/api/settings/validate-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          helpshipClientId,
          helpshipClientSecret,
        }),
      });

      const data = await response.json();

      if (data.valid) {
        setValidationStatus("valid");
        setCredentialsMessage({
          type: "success",
          text: "Credentials are valid! ✓ You can now save them."
        });
      } else {
        setValidationStatus("invalid");
        setCredentialsMessage({
          type: "error",
          text: `Invalid credentials: ${data.error}`
        });
      }
    } catch (error) {
      setValidationStatus("invalid");
      setCredentialsMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to validate credentials"
      });
    } finally {
      setIsValidatingCredentials(false);
    }
  }

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingCredentials(true);
    setCredentialsMessage(null);

    try {
      // Validate that both fields are provided
      if (!helpshipClientId || !helpshipClientSecret) {
        throw new Error("Both Client ID and Client Secret are required");
      }

      // First validate the credentials
      setIsValidatingCredentials(true);
      const validateResponse = await fetch("/api/settings/validate-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          helpshipClientId,
          helpshipClientSecret,
        }),
      });

      const validateData = await validateResponse.json();
      setIsValidatingCredentials(false);

      if (!validateData.valid) {
        setValidationStatus("invalid");
        throw new Error(`Invalid credentials: ${validateData.error}`);
      }

      setValidationStatus("valid");

      // If validation passed, save the credentials
      const response = await fetch("/api/settings/credentials", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          helpshipClientId,
          helpshipClientSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save credentials");
      }

      setCredentialsMessage({ type: "success", text: "Helpship credentials validated and saved successfully! ✓" });
      setHasExistingSecret(true);
      // Clear the secret field after saving for security
      setHelpshipClientSecret("");
    } catch (error) {
      setCredentialsMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save credentials"
      });
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metaTestMode,
          metaTestEventCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save Meta test settings");
      }

      setMetaTestMessage({ type: "success", text: "Meta test settings saved successfully!" });
    } catch (error) {
      setMetaTestMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save Meta test settings"
      });
    } finally {
      setIsSavingMetaTest(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-2">
          Manage your application settings and integrations
        </p>
      </div>

      {/* Helpship Credentials Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mb-6">
        <form onSubmit={handleSaveCredentials}>
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Helpship WMS Credentials
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="helpshipClientId"
                  className="block text-sm font-medium text-zinc-300 mb-1"
                >
                  Client ID
                </label>
                <input
                  type="text"
                  id="helpshipClientId"
                  name="helpshipClientId"
                  autoComplete="off"
                  value={helpshipClientId}
                  onChange={(e) => {
                    setHelpshipClientId(e.target.value);
                    setValidationStatus(null); // Reset validation when field changes
                  }}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                  placeholder="Enter client ID"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="helpshipClientSecret"
                  className="block text-sm font-medium text-zinc-300 mb-1"
                >
                  Client Secret
                  {hasExistingSecret && (
                    <span className="ml-2 text-xs text-emerald-400">
                      (Configured ✓)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  id="helpshipClientSecret"
                  name="helpshipClientSecret"
                  autoComplete="new-password"
                  value={helpshipClientSecret}
                  onChange={(e) => {
                    setHelpshipClientSecret(e.target.value);
                    setValidationStatus(null); // Reset validation when field changes
                  }}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                  placeholder={hasExistingSecret ? "Enter new secret to update" : "Enter client secret"}
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  OAuth2 client secret for Helpship API authentication
                </p>
              </div>

              {/* Validation Status Indicator */}
              {validationStatus && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${
                  validationStatus === "valid"
                    ? "bg-emerald-900/30 border border-emerald-700"
                    : "bg-red-900/30 border border-red-700"
                }`}>
                  {validationStatus === "valid" ? (
                    <>
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-emerald-300">Credentials verified successfully</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-red-300">Invalid credentials</span>
                    </>
                  )}
                </div>
              )}

              {/* Test Connection Button */}
              <button
                type="button"
                onClick={handleValidateCredentials}
                disabled={isValidatingCredentials || !helpshipClientId || !helpshipClientSecret}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isValidatingCredentials ? (
                  <>
                    <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>
            </div>
          </div>

          {/* Credentials Message */}
          {credentialsMessage && (
            <div className="p-6 border-b border-zinc-700">
              <div
                className={`p-3 rounded-md ${
                  credentialsMessage.type === "success"
                    ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
                    : "bg-red-900/30 border border-red-700 text-red-300"
                }`}
              >
                {credentialsMessage.text}
              </div>
            </div>
          )}

          {/* Save Credentials Button */}
          <div className="p-6 bg-zinc-800/50 flex justify-end">
            <button
              type="submit"
              disabled={isSavingCredentials || isValidatingCredentials}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSavingCredentials ? (
                <>
                  <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isValidatingCredentials ? "Validating & Saving..." : "Saving..."}
                </>
              ) : (
                "Save Credentials"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Meta Test Mode Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mt-6">
        <form onSubmit={handleSaveMetaTest}>
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Meta Conversion Tracking Test Mode
            </h2>

            <div className="space-y-6">
              {/* Test Mode Toggle */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="metaTestMode"
                  checked={metaTestMode}
                  onChange={(e) => setMetaTestMode(e.target.checked)}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded"
                />
                <label htmlFor="metaTestMode" className="ml-3">
                  <span className="block text-sm font-medium text-white">
                    Enable Meta Test Mode
                  </span>
                  <span className="block text-sm text-zinc-400 mt-1">
                    When enabled, all Meta Conversion API events will be sent in test mode. This allows you to validate events in Meta Events Manager before going live.
                  </span>
                </label>
              </div>

              {/* Test Event Code */}
              {metaTestMode && (
                <div>
                  <label htmlFor="metaTestEventCode" className="block text-sm font-medium text-white mb-2">
                    Test Event Code
                  </label>
                  <input
                    type="text"
                    id="metaTestEventCode"
                    value={metaTestEventCode}
                    onChange={(e) => setMetaTestEventCode(e.target.value)}
                    placeholder="TEST12345"
                    className="w-full max-w-md px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-sm text-zinc-400 mt-2">
                    Enter the test event code from Meta Events Manager → Test Events. This code allows you to see events in the Test Events tool.
                  </p>
                </div>
              )}

              <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-md">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> Test mode applies globally to all landing pages. Make sure to disable it once you've validated your tracking setup.
                </p>
              </div>
            </div>
          </div>

          {/* Meta Test Message */}
          {metaTestMessage && (
            <div className="p-6 border-b border-zinc-700">
              <div
                className={`p-3 rounded-md ${
                  metaTestMessage.type === "success"
                    ? "bg-emerald-900/20 text-emerald-300 border border-emerald-700"
                    : "bg-red-900/20 text-red-300 border border-red-700"
                }`}
              >
                {metaTestMessage.text}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="p-6 bg-zinc-800/50 flex justify-end">
            <button
              type="submit"
              disabled={isSavingMetaTest}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSavingMetaTest ? "Saving..." : "Save Meta Test Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* VAT Settings Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mt-6">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingVat(true);
          setVatMessage(null);
          try {
            const response = await fetch("/api/settings/vat", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vatEnabled: vatEnabled }),
            });
            if (!response.ok) throw new Error("Failed to save VAT settings");
            setVatMessage({ type: "success", text: "Setările TVA au fost salvate." });
          } catch (error) {
            console.error("Error saving VAT settings:", error);
            setVatMessage({ type: "error", text: "Eroare la salvarea setărilor TVA." });
          } finally {
            setIsSavingVat(false);
          }
        }}>
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              VAT Settings
            </h2>

            <div className="space-y-6">
              {/* VAT Payer Checkbox */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="vatPayer"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded"
                />
                <label htmlFor="vatPayer" className="ml-3">
                  <span className="block text-sm font-medium text-white">
                    Organizația este plătitoare de TVA
                  </span>
                  <span className="block text-sm text-zinc-400 mt-1">
                    Activează această opțiune dacă organizația ta este înregistrată ca plătitor de TVA în România. Comenzile trimise către Helpship vor include TVA de 21%.
                  </span>
                </label>
              </div>

              {/* VAT Rate Field - always disabled, fixed at 21% */}
              <div>
                <label htmlFor="vatRate" className="block text-sm font-medium text-zinc-300 mb-1">
                  Cota TVA (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    id="vatRate"
                    value={21}
                    disabled
                    className="w-24 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white cursor-not-allowed opacity-60"
                  />
                  <span className="text-sm text-zinc-400">
                    Cota standard de TVA pentru România (fixă)
                  </span>
                </div>
              </div>

              {/* Status info */}
              <div className={`p-4 rounded-md ${vatEnabled ? 'bg-emerald-900/20 border border-emerald-700/50' : 'bg-zinc-700/50 border border-zinc-600'}`}>
                <p className={`text-sm ${vatEnabled ? 'text-emerald-300' : 'text-zinc-400'}`}>
                  {vatEnabled
                    ? 'Comenzile trimise către Helpship vor include TVA de 21% pe produse și livrare.'
                    : 'Comenzile trimise către Helpship NU vor include TVA (0%).'}
                </p>
              </div>

              {vatMessage && (
                <div className={`p-3 rounded-md text-sm ${vatMessage.type === "success" ? "bg-emerald-900/20 border border-emerald-700 text-emerald-300" : "bg-red-900/20 border border-red-700 text-red-300"}`}>
                  {vatMessage.text}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-zinc-800/50 flex justify-end">
            <button
              type="submit"
              disabled={isSavingVat}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSavingVat ? "Se salvează..." : "Save VAT Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Vapi AI Phone Calls Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mt-6">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setIsSavingVapi(true);
          setVapiMessage(null);
          try {
            const body: Record<string, string> = {};
            if (vapiApiKey) body.vapiApiKey = vapiApiKey;
            if (vapiPhoneNumberId) body.vapiPhoneNumberId = vapiPhoneNumberId;
            if (vapiAssistantId) body.vapiAssistantId = vapiAssistantId;

            if (Object.keys(body).length === 0) {
              throw new Error("Completează cel puțin un câmp");
            }

            const response = await fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || "Failed to save Vapi settings");
            }
            setVapiMessage({ type: "success", text: "Setările Vapi au fost salvate cu succes!" });
            if (vapiApiKey) {
              setHasExistingVapiKey(true);
              setVapiApiKey("");
            }
          } catch (error) {
            setVapiMessage({
              type: "error",
              text: error instanceof Error ? error.message : "Eroare la salvarea setărilor Vapi",
            });
          } finally {
            setIsSavingVapi(false);
          }
        }}>
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-1">
              Vapi AI Phone Calls
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Configurează credențialele pentru apeluri telefonice AI de confirmare comenzi
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="vapiApiKey" className="block text-sm font-medium text-zinc-300 mb-1">
                  API Key
                  {hasExistingVapiKey && (
                    <span className="ml-2 text-xs text-emerald-400">(Configured ✓)</span>
                  )}
                </label>
                <input
                  type="password"
                  id="vapiApiKey"
                  autoComplete="new-password"
                  value={vapiApiKey}
                  onChange={(e) => setVapiApiKey(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-zinc-400"
                  placeholder={hasExistingVapiKey ? "Enter new key to update" : "Enter Vapi API key"}
                />
              </div>

              <div>
                <label htmlFor="vapiPhoneNumberId" className="block text-sm font-medium text-zinc-300 mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  id="vapiPhoneNumberId"
                  value={vapiPhoneNumberId}
                  onChange={(e) => setVapiPhoneNumberId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-zinc-400"
                  placeholder="Enter Vapi phone number ID"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  ID-ul numărului de telefon din Vapi dashboard (Phone Numbers)
                </p>
              </div>

              <div>
                <label htmlFor="vapiAssistantId" className="block text-sm font-medium text-zinc-300 mb-1">
                  Assistant ID
                </label>
                <input
                  type="text"
                  id="vapiAssistantId"
                  value={vapiAssistantId}
                  onChange={(e) => setVapiAssistantId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-zinc-400"
                  placeholder="Enter Vapi assistant ID"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  ID-ul assistant-ului configurat pentru confirmarea comenzilor
                </p>
              </div>
            </div>
          </div>

          {vapiMessage && (
            <div className="p-6 border-b border-zinc-700">
              <div className={`p-3 rounded-md text-sm ${
                vapiMessage.type === "success"
                  ? "bg-emerald-900/20 border border-emerald-700 text-emerald-300"
                  : "bg-red-900/20 border border-red-700 text-red-300"
              }`}>
                {vapiMessage.text}
              </div>
            </div>
          )}

          <div className="p-6 bg-zinc-800/50 flex justify-end">
            <button
              type="submit"
              disabled={isSavingVapi}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSavingVapi ? "Se salvează..." : "Save Vapi Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Meta Ads Dashboard Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 mt-6">
        <div className="p-6 border-b border-zinc-700">
          <h2 className="text-xl font-semibold text-white mb-1">
            Meta Ads Dashboard
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Conectează contul tău Meta Ads pentru a vizualiza performanța campaniilor
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="metaAdsToken" className="block text-sm font-medium text-zinc-300 mb-1">
                Access Token
                {hasExistingMetaAdsToken && (
                  <span className="ml-2 text-xs text-emerald-400">(Configured ✓)</span>
                )}
              </label>
              <input
                type="password"
                id="metaAdsToken"
                autoComplete="new-password"
                value={metaAdsToken}
                onChange={(e) => {
                  setMetaAdsToken(e.target.value);
                  setMetaAdsAccounts([]);
                  setMetaAdsMessage(null);
                }}
                className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-zinc-400"
                placeholder={hasExistingMetaAdsToken ? "Enter new token to update" : "Enter Meta access token"}
              />
              <p className="text-xs text-zinc-400 mt-1">
                System User access token din Meta Business Suite cu permisiune ads_read
              </p>
            </div>

            {/* Test Connection Button */}
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
                  if (!data.accounts || data.accounts.length === 0) {
                    throw new Error("No ad accounts found for this token");
                  }
                  setMetaAdsAccounts(data.accounts);
                  if (!metaAdsAccountId && data.accounts.length > 0) {
                    setMetaAdsAccountId(data.accounts[0].id);
                  }
                  setMetaAdsMessage({ type: "success", text: `${data.accounts.length} ad account(s) found!` });
                } catch (error) {
                  setMetaAdsMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Failed to test connection",
                  });
                } finally {
                  setIsTestingMetaAds(false);
                }
              }}
              disabled={isTestingMetaAds || (!metaAdsToken && !hasExistingMetaAdsToken)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isTestingMetaAds ? "Testing..." : "Test Connection"}
            </button>

            {/* Ad Account Selector */}
            {metaAdsAccounts.length > 0 && (
              <div>
                <label htmlFor="metaAdsAccount" className="block text-sm font-medium text-zinc-300 mb-1">
                  Ad Account
                </label>
                <select
                  id="metaAdsAccount"
                  value={metaAdsAccountId}
                  onChange={(e) => setMetaAdsAccountId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  {metaAdsAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.id}) - {acc.currency}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current Account ID (when accounts not loaded but saved) */}
            {metaAdsAccountId && metaAdsAccounts.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Selected Ad Account
                </label>
                <p className="text-sm text-zinc-400">{metaAdsAccountId}</p>
              </div>
            )}
          </div>
        </div>

        {metaAdsMessage && (
          <div className="p-6 border-b border-zinc-700">
            <div className={`p-3 rounded-md text-sm ${
              metaAdsMessage.type === "success"
                ? "bg-emerald-900/20 border border-emerald-700 text-emerald-300"
                : "bg-red-900/20 border border-red-700 text-red-300"
            }`}>
              {metaAdsMessage.text}
            </div>
          </div>
        )}

        <div className="p-6 bg-zinc-800/50 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              setIsSavingMetaAds(true);
              setMetaAdsMessage(null);
              try {
                const body: Record<string, string> = {};
                if (metaAdsToken) body.metaAdsAccessToken = metaAdsToken;
                if (metaAdsAccountId) body.metaAdsAccountId = metaAdsAccountId;

                if (Object.keys(body).length === 0) {
                  throw new Error("Enter a token or select an account first");
                }

                const res = await fetch("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "Failed to save");
                }
                setMetaAdsMessage({ type: "success", text: "Meta Ads settings saved!" });
                if (metaAdsToken) {
                  setHasExistingMetaAdsToken(true);
                  setMetaAdsToken("");
                }
              } catch (error) {
                setMetaAdsMessage({
                  type: "error",
                  text: error instanceof Error ? error.message : "Failed to save",
                });
              } finally {
                setIsSavingMetaAds(false);
              }
            }}
            disabled={isSavingMetaAds}
            className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSavingMetaAds ? "Se salvează..." : "Save Meta Ads Settings"}
          </button>
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-md">
        <p className="text-sm text-blue-300">
          <strong>Security Note:</strong> The Client Secret is encrypted and stored securely.
          For security reasons, the secret is not displayed after saving.
          You only need to enter it again if you want to update it.
        </p>
      </div>
    </div>
  );
}
