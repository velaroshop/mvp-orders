"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [helpshipClientId, setHelpshipClientId] = useState("");
  const [helpshipClientSecret, setHelpshipClientSecret] = useState("");
  const [duplicateCheckDays, setDuplicateCheckDays] = useState(21);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Load settings from API
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Failed to load settings");

        const data = await response.json();
        setHelpshipClientId(data.settings.helpship_client_id || "");
        setDuplicateCheckDays(data.settings.duplicate_check_days || 21);
        // Don't show the actual secret, leave it empty for security
        setHelpshipClientSecret("");
      } catch (error) {
        console.error("Error loading settings:", error);
        setMessage({ type: "error", text: "Failed to load settings" });
      }
    }

    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          helpshipClientId,
          helpshipClientSecret,
          duplicateCheckDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      setMessage({ type: "success", text: "Settings saved successfully!" });
      // Clear the secret field after saving for security
      setHelpshipClientSecret("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save settings"
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
        <p className="text-zinc-600 mt-2">
          Manage your application settings and integrations
        </p>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-sm border border-zinc-200">
        <form onSubmit={handleSave}>
          {/* Helpship Integration Section */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Helpship WMS Integration
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="helpshipClientId"
                  className="block text-sm font-medium text-zinc-900 mb-1"
                >
                  Client ID
                </label>
                <input
                  type="text"
                  id="helpshipClientId"
                  value={helpshipClientId}
                  onChange={(e) => setHelpshipClientId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-500"
                  placeholder="client_id"
                />
              </div>

              <div>
                <label
                  htmlFor="helpshipClientSecret"
                  className="block text-sm font-medium text-zinc-900 mb-1"
                >
                  Client Secret
                </label>
                <input
                  type="password"
                  id="helpshipClientSecret"
                  value={helpshipClientSecret}
                  onChange={(e) => setHelpshipClientSecret(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-500"
                  placeholder="secret"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  OAuth2 client secret for Helpship API authentication
                </p>
              </div>
            </div>
          </div>

          {/* Duplicate Check Settings */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Duplicate Order Detection
            </h2>

            <div>
              <label
                htmlFor="duplicateCheckDays"
                className="block text-sm font-medium text-zinc-900 mb-1"
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
                className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-500"
                placeholder="21"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Number of days to check for duplicate orders from the same phone number when confirming partial orders
              </p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="p-6 border-b border-zinc-200">
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {message.text}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="p-6 bg-zinc-50 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Security Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Security Note:</strong> The Client Secret is encrypted and stored securely.
          For security reasons, the secret is not displayed after saving.
          Leave the field empty if you don't want to change it.
        </p>
      </div>
    </div>
  );
}
