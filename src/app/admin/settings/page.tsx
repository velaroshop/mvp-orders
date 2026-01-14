"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [orderPrefix, setOrderPrefix] = useState("");
  const [helpshipClientId, setHelpshipClientId] = useState("");
  const [helpshipClientSecret, setHelpshipClientSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // TODO: Load settings from API/database
    // Placeholder pentru loading din backend
    setOrderPrefix("JMR-TEST");
    setHelpshipClientId("velaro-trading-dev");
    setHelpshipClientSecret("••••••••••••"); // Masked pentru securitate
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // TODO: Implement save to database via API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
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
          {/* Order Settings Section */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Order Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="orderPrefix"
                  className="block text-sm font-medium text-zinc-700 mb-1"
                >
                  Order Prefix
                </label>
                <input
                  type="text"
                  id="orderPrefix"
                  value={orderPrefix}
                  onChange={(e) => setOrderPrefix(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="JMR-TEST"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Prefix used for order numbers (e.g., JMR-TEST-00001)
                </p>
              </div>
            </div>
          </div>

          {/* Helpship Integration Section */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Helpship WMS Integration
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="helpshipClientId"
                  className="block text-sm font-medium text-zinc-700 mb-1"
                >
                  Client ID
                </label>
                <input
                  type="text"
                  id="helpshipClientId"
                  value={helpshipClientId}
                  onChange={(e) => setHelpshipClientId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="velaro-trading-dev"
                />
              </div>

              <div>
                <label
                  htmlFor="helpshipClientSecret"
                  className="block text-sm font-medium text-zinc-700 mb-1"
                >
                  Client Secret
                </label>
                <input
                  type="password"
                  id="helpshipClientSecret"
                  value={helpshipClientSecret}
                  onChange={(e) => setHelpshipClientSecret(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••••••••••"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  OAuth2 client secret for Helpship API authentication
                </p>
              </div>
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

      {/* Note about implementation */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> This is a placeholder UI. Backend implementation
          for saving settings to database is pending.
        </p>
      </div>
    </div>
  );
}
