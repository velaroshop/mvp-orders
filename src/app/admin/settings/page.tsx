"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [helpshipClientId, setHelpshipClientId] = useState("");
  const [helpshipClientSecret, setHelpshipClientSecret] = useState("");
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  const [duplicateCheckDays, setDuplicateCheckDays] = useState(21);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [credentialsMessage, setCredentialsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [generalMessage, setGeneralMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Load settings from API
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Failed to load settings");

        const data = await response.json();
        setHelpshipClientId(data.settings.helpship_client_id || "");
        setDuplicateCheckDays(data.settings.duplicate_check_days || 21);
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

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingCredentials(true);
    setCredentialsMessage(null);

    try {
      // Validate that both fields are provided
      if (!helpshipClientId || !helpshipClientSecret) {
        throw new Error("Both Client ID and Client Secret are required");
      }

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

      setCredentialsMessage({ type: "success", text: "Helpship credentials saved successfully!" });
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
    }
  }

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralMessage(null);

    try {
      const response = await fetch("/api/settings/general", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duplicateCheckDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save general settings");
      }

      setGeneralMessage({ type: "success", text: "General settings saved successfully!" });
    } catch (error) {
      setGeneralMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save general settings"
      });
    } finally {
      setIsSavingGeneral(false);
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
                  value={helpshipClientId}
                  onChange={(e) => setHelpshipClientId(e.target.value)}
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
                  value={helpshipClientSecret}
                  onChange={(e) => setHelpshipClientSecret(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                  placeholder={hasExistingSecret ? "Enter new secret to update" : "Enter client secret"}
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  OAuth2 client secret for Helpship API authentication
                </p>
              </div>
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
              disabled={isSavingCredentials}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSavingCredentials ? "Saving..." : "Save Credentials"}
            </button>
          </div>
        </form>
      </div>

      {/* General Settings Section */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700">
        <form onSubmit={handleSaveGeneral}>
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              General Settings
            </h2>

            <div className="space-y-6">
              {/* Duplicate Order Detection */}
              <div>
                <h3 className="text-base font-medium text-zinc-200 mb-3">
                  Duplicate Order Detection
                </h3>
                <label
                  htmlFor="duplicateCheckDays"
                  className="block text-sm font-medium text-zinc-300 mb-1"
                >
                  Check Period (Days)
                </label>
                <input
                  type="number"
                  id="duplicateCheckDays"
                  min="1"
                  max="365"
                  value={duplicateCheckDays}
                  onChange={(e) => setDuplicateCheckDays(parseInt(e.target.value) || 21)}
                  className="w-full max-w-md px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                  placeholder="21"
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Number of days to check for duplicate orders from the same phone number when confirming partial orders
                </p>
              </div>
            </div>
          </div>

          {/* General Settings Message */}
          {generalMessage && (
            <div className="p-6 border-b border-zinc-700">
              <div
                className={`p-3 rounded-md ${
                  generalMessage.type === "success"
                    ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
                    : "bg-red-900/30 border border-red-700 text-red-300"
                }`}
              >
                {generalMessage.text}
              </div>
            </div>
          )}

          {/* Save General Settings Button */}
          <div className="p-6 bg-zinc-800/50 flex justify-end">
            <button
              type="submit"
              disabled={isSavingGeneral}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSavingGeneral ? "Saving..." : "Save General Settings"}
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
