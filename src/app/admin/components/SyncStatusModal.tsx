"use client";

import { useState, useEffect } from "react";

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (newStatus: string) => Promise<void>;
  orderId: string;
}

interface SyncData {
  currentMvpStatus: string;
  helpshipStatus: string;
  suggestedMvpStatus: string | null;
  needsSync: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  hold: "Hold",
  queue: "Queue",
  testing: "Testing",
  sync_error: "Sync Error",
  scheduled: "Scheduled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-emerald-500",
  cancelled: "bg-red-500",
  hold: "bg-orange-500",
  queue: "bg-purple-500",
  testing: "bg-blue-500",
  sync_error: "bg-pink-500",
  scheduled: "bg-cyan-500",
};

export default function SyncStatusModal({
  isOpen,
  onClose,
  onSync,
  orderId,
}: SyncStatusModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncData, setSyncData] = useState<SyncData | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchStatus();
    }
    if (!isOpen) {
      setSyncData(null);
      setError(null);
    }
  }, [isOpen, orderId]);

  async function fetchStatus() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/sync-status`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to check status");
      }
      const data = await response.json();
      setSyncData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check status");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    if (!syncData?.suggestedMvpStatus) return;
    setIsSyncing(true);
    setError(null);
    try {
      await onSync(syncData.suggestedMvpStatus);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync status");
    } finally {
      setIsSyncing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">SYNC FROM HELPSHIP</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
            disabled={isSyncing}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
              <p className="mt-3 text-sm text-zinc-600">
                Checking Helpship status...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={fetchStatus}
                className="mt-2 text-sm text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          )}

          {syncData && !isLoading && (
            <>
              {/* Status comparison */}
              <div className="flex items-center gap-4 mb-6">
                {/* MVP Status */}
                <div className="flex-1 text-center">
                  <p className="text-xs text-zinc-500 mb-2">MVP Status</p>
                  <span
                    className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium text-white ${
                      STATUS_COLORS[syncData.currentMvpStatus] || "bg-zinc-500"
                    }`}
                  >
                    {STATUS_LABELS[syncData.currentMvpStatus] || syncData.currentMvpStatus}
                  </span>
                </div>

                {/* Arrow */}
                <div className="text-zinc-400 text-2xl">
                  {syncData.needsSync ? "→" : "="}
                </div>

                {/* Helpship Status */}
                <div className="flex-1 text-center">
                  <p className="text-xs text-zinc-500 mb-2">Helpship Status</p>
                  <span
                    className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium text-white ${
                      STATUS_COLORS[syncData.suggestedMvpStatus || ""] || "bg-zinc-500"
                    }`}
                  >
                    {syncData.helpshipStatus}
                  </span>
                </div>
              </div>

              {/* Sync message */}
              {syncData.needsSync ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md mb-4">
                  <p className="text-sm text-amber-800">
                    Statusurile sunt diferite. Vrei sa actualizezi statusul local de la{" "}
                    <strong>{STATUS_LABELS[syncData.currentMvpStatus]}</strong> la{" "}
                    <strong>{STATUS_LABELS[syncData.suggestedMvpStatus || ""]}</strong>?
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md mb-4">
                  <p className="text-sm text-emerald-800">
                    Statusurile sunt deja sincronizate. Nu e necesara nicio actiune.
                  </p>
                </div>
              )}

              {!syncData.suggestedMvpStatus && syncData.helpshipStatus === "Error" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                  <p className="text-sm text-red-800">
                    Comanda are statusul &quot;Error&quot; in Helpship. Verifica manual in
                    dashboard-ul Helpship.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50"
            >
              Close
            </button>
            {syncData?.needsSync && syncData.suggestedMvpStatus && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSyncing ? "Syncing..." : "Sync Status"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
