"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [helpshipClientId, setHelpshipClientId] = useState("");
  const [helpshipClientSecret, setHelpshipClientSecret] = useState("");
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  const [metaTestMode, setMetaTestMode] = useState(false);
  const [metaTestEventCode, setMetaTestEventCode] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isSavingMetaTest, setIsSavingMetaTest] = useState(false);
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(false);
  const [credentialsMessage, setCredentialsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [metaTestMessage, setMetaTestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [validationStatus, setValidationStatus] = useState<"valid" | "invalid" | null>(null);

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
        // Check if secret exists but don't show it
        setHasExistingSecret(!!data.settings.helpship_client_secret);
        setHelpshipClientSecret("");
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
