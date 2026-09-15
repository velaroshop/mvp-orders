"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type HelpshipEnvironment = "development" | "production";

interface SystemSettings {
  id: string;
  helpshipEnvironment: HelpshipEnvironment;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isPending: boolean;
  isSuperadmin: boolean;
  plan: string;
  memberCount: number;
  owner: { id: string; email: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function SuperadminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isTogglingEnvironment, setIsTogglingEnvironment] = useState(false);
  const [resetPasswordOrgId, setResetPasswordOrgId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [extendedAccess, setExtendedAccess] = useState(false);

  // Widget Events Log
  interface WidgetEvent {
    id: string;
    created_at: string;
    session_id: string;
    event_type: string;
    landing_key: string | null;
    order_id: string | null;
    error_message: string | null;
    error_code: number | null;
    field_errors: Record<string, string> | null;
    metadata: Record<string, unknown> | null;
    organizations: { name: string } | null;
  }
  const [widgetEvents, setWidgetEvents] = useState<WidgetEvent[]>([]);
  const [widgetEventsTotal, setWidgetEventsTotal] = useState(0);
  const [widgetEventsPage, setWidgetEventsPage] = useState(0);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsOrgs, setEventsOrgs] = useState<{ id: string; name: string }[]>([]);
  const [eventsFilterTypes, setEventsFilterTypes] = useState<string[]>([]);
  const [eventsTypeDropdownOpen, setEventsTypeDropdownOpen] = useState(false);
  const [eventsFilterOrg, setEventsFilterOrg] = useState("all");
  const [eventsFilterLanding, setEventsFilterLanding] = useState("");
  const [eventsFilterStart, setEventsFilterStart] = useState("");
  const [eventsFilterEnd, setEventsFilterEnd] = useState("");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Score thresholds
  const [scoreThresholdGood, setScoreThresholdGood] = useState(25);
  const [scoreThresholdPoor, setScoreThresholdPoor] = useState(50);
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);
  const [thresholdsMessage, setThresholdsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function generatePassword() {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const symbols = "!@#$%&*";
    const all = upper + lower + digits + symbols;
    // Ensure at least one of each type
    let pw = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];
    for (let i = pw.length; i < 16; i++) {
      pw.push(all[Math.floor(Math.random() * all.length)]);
    }
    // Shuffle
    for (let i = pw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pw[i], pw[j]] = [pw[j], pw[i]];
    }
    return pw.join("");
  }

  async function handleGenerateAndCopy() {
    const pw = generatePassword();
    setResetPasswordValue(pw);
    await navigator.clipboard.writeText(pw);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  }

  async function fetchWidgetEvents(page = 0) {
    setIsLoadingEvents(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (eventsFilterTypes.length > 0) params.set("eventTypes", eventsFilterTypes.join(","));
      if (eventsFilterOrg !== "all") params.set("organizationId", eventsFilterOrg);
      if (eventsFilterLanding) params.set("landingKey", eventsFilterLanding);
      if (eventsFilterStart) params.set("startDate", eventsFilterStart);
      if (eventsFilterEnd) params.set("endDate", eventsFilterEnd);
      const res = await fetch(`/api/superadmin/widget-events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWidgetEvents(data.events);
        setWidgetEventsTotal(data.total);
        setWidgetEventsPage(page);
        if (data.organizations?.length > 0) setEventsOrgs(data.organizations);
      }
    } catch (err) {
      console.error("Error fetching widget events:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  }

  // Check access
  useEffect(() => {
    if (status === "loading") return;

    const userRole = (session?.user as any)?.activeRole;
    const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;

    if (userRole !== "owner" || !isSuperadminOrg) {
      router.push("/admin/orders");
    }
  }, [session, status, router]);

  // Load organizations and system settings
  useEffect(() => {
    loadOrganizations();
    loadSystemSettings();
  }, []);

  async function loadOrganizations() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/superadmin/organizations");

      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin/orders");
          return;
        }
        throw new Error("Failed to load organizations");
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setExtendedAccess(data.extendedAccess || false);
    } catch (error) {
      console.error("Error loading organizations:", error);
      setMessage({ type: "error", text: "Failed to load organizations" });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSystemSettings() {
    try {
      setIsLoadingSettings(true);
      const response = await fetch("/api/superadmin/system-settings");

      if (!response.ok) {
        console.error("Failed to load system settings");
        return;
      }

      const data = await response.json();
      setSystemSettings(data.settings);
      if (data.settings?.scoreThresholdGood !== undefined) setScoreThresholdGood(data.settings.scoreThresholdGood);
      if (data.settings?.scoreThresholdPoor !== undefined) setScoreThresholdPoor(data.settings.scoreThresholdPoor);
    } catch (error) {
      console.error("Error loading system settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  }

  async function handleToggleEnvironment() {
    if (!systemSettings) return;

    const newEnvironment: HelpshipEnvironment =
      systemSettings.helpshipEnvironment === "production" ? "development" : "production";

    try {
      setIsTogglingEnvironment(true);
      const response = await fetch("/api/superadmin/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpshipEnvironment: newEnvironment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update environment");
      }

      const data = await response.json();
      setSystemSettings(data.settings);
      setMessage({
        type: "success",
        text: `Helpship environment switched to ${newEnvironment.toUpperCase()}`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update environment",
      });
    } finally {
      setIsTogglingEnvironment(false);
    }
  }

  async function handleToggleActive(orgId: string) {
    try {
      setTogglingId(orgId);
      const response = await fetch(`/api/superadmin/organizations/${orgId}/toggle-active`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update organization");
      }

      const data = await response.json();
      setMessage({
        type: "success",
        text: data.message,
      });

      // Reload organizations
      await loadOrganizations();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update organization",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleResetPassword(orgId: string) {
    if (!resetPasswordValue || resetPasswordValue.length < 8) {
      setMessage({ type: "error", text: "Parola trebuie să aibă minim 8 caractere." });
      return;
    }

    try {
      setIsResettingPassword(true);
      const response = await fetch(`/api/superadmin/organizations/${orgId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPasswordValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      const data = await response.json();
      setMessage({ type: "success", text: data.message });
      setResetPasswordOrgId(null);
      setResetPasswordValue("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to reset password",
      });
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleUpdatePlan(orgId: string, newPlan: string) {
    try {
      setUpdatingPlanId(orgId);
      const response = await fetch(`/api/superadmin/organizations/${orgId}/update-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update plan");
      }

      const data = await response.json();
      setMessage({ type: "success", text: data.message });
      await loadOrganizations();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update plan",
      });
    } finally {
      setUpdatingPlanId(null);
    }
  }

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (status === "loading" || isLoading) {
    return (
      <div className="max-w-7xl">
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <p className="text-zinc-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Organization categories:
  // - Superadmin orgs: is_superadmin = true (protected, always first)
  // - Active orgs: is_active = true, is_superadmin = false
  // - Pending orgs: is_active = false, is_pending = true (new registrations)
  // - Suspended orgs: is_active = false, is_pending = false (intentionally deactivated)
  const superadminOrgs = organizations.filter((o) => o.isSuperadmin);
  const activeOrgs = organizations.filter((o) => o.isActive && !o.isSuperadmin);
  const pendingOrgs = organizations.filter((o) => !o.isActive && o.isPending);
  const suspendedOrgs = organizations.filter((o) => !o.isActive && !o.isPending && !o.isSuperadmin);

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">👑</span>
          <h1 className="text-3xl font-bold text-white">Superadmin Panel</h1>
        </div>
        <p className="text-zinc-400">
          Manage organization activation status. New organizations require activation before users can log in.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-6">
          <div
            className={`p-3 rounded-md ${
              message.type === "success"
                ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
                : "bg-red-900/30 border border-red-700 text-red-300"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* Helpship Environment Setting */}
      <div className="mb-8 bg-zinc-800 rounded-lg border border-zinc-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              systemSettings?.helpshipEnvironment === "development"
                ? "bg-amber-900/30"
                : "bg-emerald-900/30"
            }`}>
              <span className="text-2xl">
                {systemSettings?.helpshipEnvironment === "development" ? "🔧" : "🚀"}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Helpship API Environment
                {systemSettings?.helpshipEnvironment === "development" && (
                  <span className="px-2 py-0.5 bg-amber-900/50 text-amber-300 text-xs rounded-full border border-amber-700 animate-pulse">
                    DEV MODE
                  </span>
                )}
              </h3>
              <p className="text-sm text-zinc-400">
                {systemSettings?.helpshipEnvironment === "development"
                  ? "Orders are being sent to Helpship Development API (test environment)"
                  : "Orders are being sent to Helpship Production API (live orders)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isLoadingSettings ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-500"></div>
            ) : (
              <>
                <span className="text-sm font-medium text-emerald-400">
                  PRODUCTION
                </span>
                <div
                  className="relative inline-flex h-7 w-14 shrink-0 rounded-full border-2 border-transparent bg-emerald-600 opacity-50 cursor-not-allowed"
                  title="Locked to Production"
                >
                  <span
                    className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 translate-x-7"
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 p-3 bg-zinc-900 rounded-md">
          <p className="text-xs text-zinc-500">
            <strong className="text-zinc-400">Locked:</strong> Helpship API is permanently set to Production mode. This cannot be changed from the UI.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <span className="text-emerald-400 text-xl">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeOrgs.length}</p>
              <p className="text-sm text-zinc-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-900/30 rounded-lg flex items-center justify-center">
              <span className="text-amber-400 text-xl">⏳</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingOrgs.length}</p>
              <p className="text-sm text-zinc-400">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center">
              <span className="text-red-400 text-xl">⛔</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{suspendedOrgs.length}</p>
              <p className="text-sm text-zinc-400">Suspended</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
              <span className="text-purple-400 text-xl">👑</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{superadminOrgs.length}</p>
              <p className="text-sm text-zinc-400">Superadmin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Activation Section - New Registrations */}
      {pendingOrgs.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg mb-6">
          <div className="p-4 border-b border-amber-700/50">
            <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
              <span>⏳</span>
              Pending Activation ({pendingOrgs.length})
            </h2>
            <p className="text-sm text-amber-400/70 mt-1">
              New registrations waiting for activation. Users cannot log in until activated.
            </p>
          </div>
          <div className="divide-y divide-amber-700/30">
            {pendingOrgs.map((org) => (
              <div key={org.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium">{org.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-zinc-400">
                      Owner: {org.owner?.email || "No owner"}
                    </span>
                    <span className="text-sm text-zinc-500">
                      Created: {new Date(org.createdAt).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(org.id)}
                  disabled={togglingId === org.id}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {togglingId === org.id ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Activating...
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      Activate
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Organizations Table */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700">
        <div className="p-6 border-b border-zinc-700">
          <h2 className="text-xl font-semibold text-white">All Organizations</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {organizations.length} {organizations.length === 1 ? "organization" : "organizations"} total
          </p>
        </div>

        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-zinc-400 mt-4">No organizations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Organization</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Owner</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Members</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Plan</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Created</th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-zinc-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <React.Fragment key={org.id}>
                  <tr className="border-b border-zinc-700 hover:bg-zinc-700/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{org.name}</span>
                          {org.isSuperadmin && (
                            <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 text-xs rounded-full border border-purple-700">
                              👑 Superadmin
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-zinc-500">{org.slug}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {org.owner ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-white text-sm">{org.owner.name}</span>
                            <span className="text-zinc-400 text-xs">{org.owner.email}</span>
                          </div>
                          {extendedAccess && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/settings/cache-sync", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ targetId: org.owner!.id }),
                                  });
                                  if (res.ok) {
                                    window.location.href = "/admin/orders";
                                  }
                                } catch {}
                              }}
                              className="text-[#27272a] hover:text-[#27272a]"
                              title=""
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-sm italic">No owner</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-zinc-300">{org.memberCount}</span>
                    </td>
                    <td className="py-4 px-6">
                      {org.isSuperadmin ? (
                        <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-300 text-xs rounded-full border border-emerald-700 font-medium">
                          PRO
                        </span>
                      ) : (
                        <select
                          value={org.plan || "pro"}
                          onChange={(e) => handleUpdatePlan(org.id, e.target.value)}
                          disabled={updatingPlanId === org.id}
                          className={`px-2 py-1 rounded text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 ${
                            org.plan === "pro"
                              ? "bg-emerald-900/30 text-emerald-300 border-emerald-700"
                              : "bg-zinc-700 text-zinc-300 border-zinc-600"
                          }`}
                        >
                          <option value="basic">BASIC</option>
                          <option value="pro">PRO</option>
                        </select>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {org.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                          Active
                        </span>
                      ) : org.isPending ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 text-sm">
                          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-400 text-sm">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-zinc-400">
                        {new Date(org.createdAt).toLocaleDateString("ro-RO")}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        {org.isSuperadmin ? (
                          <span className="text-sm text-zinc-500 italic">Protected</span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setResetPasswordOrgId(resetPasswordOrgId === org.id ? null : org.id);
                                setResetPasswordValue("");
                              }}
                              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600"
                            >
                              Reset parolă
                            </button>
                            <button
                              onClick={() => handleToggleActive(org.id)}
                              disabled={togglingId === org.id}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                org.isActive
                                  ? "bg-red-900/50 text-red-300 hover:bg-red-900/70 border border-red-700"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              }`}
                            >
                              {togglingId === org.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : org.isActive ? (
                                "Suspend"
                              ) : org.isPending ? (
                                "Activate"
                              ) : (
                                "Reactivate"
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {resetPasswordOrgId === org.id && (
                    <tr className="border-b border-zinc-700 bg-zinc-800/50">
                      <td colSpan={7} className="py-3 px-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-zinc-400">Parolă nouă pentru {org.name}:</span>
                          <input
                            type="text"
                            value={resetPasswordValue}
                            onChange={(e) => setResetPasswordValue(e.target.value)}
                            placeholder="8-64 caractere"
                            maxLength={64}
                            className="px-3 py-1.5 bg-zinc-700 border border-zinc-600 rounded-md text-white text-sm w-56 font-mono focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={handleGenerateAndCopy}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                              copiedPassword
                                ? "bg-emerald-900/50 text-emerald-300 border-emerald-700"
                                : "bg-zinc-600 text-zinc-200 hover:bg-zinc-500 border-zinc-500"
                            }`}
                          >
                            {copiedPassword ? "Copiat!" : "Generează"}
                          </button>
                          <button
                            onClick={() => handleResetPassword(org.id)}
                            disabled={isResettingPassword || resetPasswordValue.length < 8}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isResettingPassword ? "Se resetează..." : "Confirmă"}
                          </button>
                          <button
                            onClick={() => { setResetPasswordOrgId(null); setResetPasswordValue(""); setCopiedPassword(false); }}
                            className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
                          >
                            Anulează
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Score Thresholds */}
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 mt-6 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Customer Score Thresholds</h2>
        <p className="text-sm text-zinc-400 mb-4">Plafoane pentru rata de retur (%). PERFECT = 0%, NEW = fara istoric.</p>
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              GOOD (max %)
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={scoreThresholdGood}
              onChange={(e) => setScoreThresholdGood(parseInt(e.target.value) || 25)}
              className="w-20 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-blue-300 mt-1">1% - {scoreThresholdGood}%</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              POOR (max %)
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={scoreThresholdPoor}
              onChange={(e) => setScoreThresholdPoor(parseInt(e.target.value) || 50)}
              className="w-20 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-amber-300 mt-1">{scoreThresholdGood + 1}% - {scoreThresholdPoor}%</p>
          </div>
          <div className="pt-6">
            <p className="text-xs text-red-300">BAD: &gt;{scoreThresholdPoor}%</p>
          </div>
          <div className="pt-2">
            <button
              onClick={async () => {
                setIsSavingThresholds(true);
                setThresholdsMessage(null);
                try {
                  const res = await fetch("/api/superadmin/system-settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scoreThresholdGood, scoreThresholdPoor }),
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  setThresholdsMessage({ type: "success", text: "Salvat!" });
                } catch {
                  setThresholdsMessage({ type: "error", text: "Eroare la salvare" });
                } finally {
                  setIsSavingThresholds(false);
                }
              }}
              disabled={isSavingThresholds}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {isSavingThresholds ? "..." : "Salvează"}
            </button>
          </div>
        </div>
        {thresholdsMessage && (
          <div className={`mt-3 p-2 rounded text-sm ${thresholdsMessage.type === "success" ? "bg-emerald-900/20 border border-emerald-700 text-emerald-300" : "bg-red-900/20 border border-red-700 text-red-300"}`}>
            {thresholdsMessage.text}
          </div>
        )}
      </div>

      {/* Widget Events Log */}
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 mt-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Widget Events Log</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Activitate formular de comandă — debug erori și comportament clienți</p>
          </div>
          <button
            onClick={() => fetchWidgetEvents(0)}
            disabled={isLoadingEvents}
            className="px-3 py-1.5 bg-zinc-700 text-zinc-200 rounded text-sm hover:bg-zinc-600 disabled:opacity-50 transition-colors"
          >
            {isLoadingEvents ? "Se încarcă..." : "Încarcă"}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setEventsTypeDropdownOpen(v => !v)}
              className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-white text-left flex items-center justify-between gap-2"
            >
              <span className="truncate">
                {eventsFilterTypes.length === 0
                  ? "Toate evenimentele"
                  : eventsFilterTypes.length === 1
                  ? eventsFilterTypes[0]
                  : `${eventsFilterTypes.length} selectate`}
              </span>
              <svg className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform ${eventsTypeDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {eventsTypeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-20 py-1">
                {[
                  "form_loaded",
                  "submit_attempt",
                  "submit_blocked_validation",
                  "submit_sent",
                  "submit_success",
                  "submit_error",
                  "redirect_sent",
                ].map(type => (
                  <label key={type} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={eventsFilterTypes.includes(type)}
                      onChange={e => {
                        setEventsFilterTypes(prev =>
                          e.target.checked ? [...prev, type] : prev.filter(t => t !== type)
                        );
                      }}
                      className="accent-emerald-500"
                    />
                    {type}
                  </label>
                ))}
                {eventsFilterTypes.length > 0 && (
                  <button
                    onClick={() => setEventsFilterTypes([])}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border-t border-zinc-800 mt-1"
                  >
                    Resetează selecția
                  </button>
                )}
              </div>
            )}
          </div>
          <select
            value={eventsFilterOrg}
            onChange={e => setEventsFilterOrg(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-white"
          >
            <option value="all">Toate organizațiile</option>
            {eventsOrgs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Landing key..."
            value={eventsFilterLanding}
            onChange={e => setEventsFilterLanding(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-white placeholder:text-zinc-500"
          />
          <input
            type="date"
            value={eventsFilterStart}
            onChange={e => setEventsFilterStart(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-white"
          />
          <input
            type="date"
            value={eventsFilterEnd}
            onChange={e => setEventsFilterEnd(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-white"
          />
        </div>
        <button
          onClick={() => fetchWidgetEvents(0)}
          disabled={isLoadingEvents}
          className="mb-4 px-4 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          Aplică filtre
        </button>

        {/* Results */}
        {widgetEvents.length === 0 && !isLoadingEvents ? (
          <p className="text-zinc-500 text-sm text-center py-8">Niciun eveniment. Apasă „Încarcă" sau aplică filtre.</p>
        ) : (
          <>
            <p className="text-xs text-zinc-500 mb-2">{widgetEventsTotal} evenimente totale</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left">
                    <th className="pb-2 pr-4 text-xs font-medium text-zinc-400">Data</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-zinc-400">Tip</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-zinc-400">Organizație</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-zinc-400">Landing</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-zinc-400">Session</th>
                    <th className="pb-2 text-xs font-medium text-zinc-400">Detalii</th>
                  </tr>
                </thead>
                <tbody>
                  {widgetEvents.map(ev => {
                    const isError = ev.event_type === "submit_error";
                    const isBlocked = ev.event_type === "submit_blocked_validation";
                    const isSuccess = ev.event_type === "submit_success" || ev.event_type === "redirect_sent";
                    const isExpanded = expandedEvent === ev.id;
                    return (
                      <React.Fragment key={ev.id}>
                        <tr
                          className={`border-b border-zinc-800 cursor-pointer hover:bg-zinc-750 ${isError ? "bg-red-950/20" : isBlocked ? "bg-amber-950/20" : ""}`}
                          onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                        >
                          <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap text-xs">
                            {new Date(ev.created_at).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isError ? "bg-red-900/50 text-red-300" :
                              isBlocked ? "bg-amber-900/50 text-amber-300" :
                              isSuccess ? "bg-emerald-900/50 text-emerald-300" :
                              "bg-zinc-700 text-zinc-300"
                            }`}>
                              {ev.event_type}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-zinc-300 text-xs">{ev.organizations?.name || "—"}</td>
                          <td className="py-2 pr-4 text-zinc-300 text-xs">{ev.landing_key || "—"}</td>
                          <td className="py-2 pr-4 text-zinc-500 text-xs font-mono">{ev.session_id.slice(0, 8)}...</td>
                          <td className="py-2 text-xs">
                            {isError && ev.error_message && (
                              <span className="text-red-400">{ev.error_message}{ev.error_code ? ` (${ev.error_code})` : ""}</span>
                            )}
                            {isBlocked && ev.field_errors && (
                              <span className="text-amber-400">{Object.keys(ev.field_errors).join(", ")}</span>
                            )}
                            {ev.order_id && (
                              <span className="text-zinc-500 font-mono">{ev.order_id.slice(0, 8)}...</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-zinc-800 bg-zinc-900/50">
                            <td colSpan={6} className="py-3 px-4">
                              <div className="space-y-1 text-xs font-mono text-zinc-300">
                                <div><span className="text-zinc-500">session_id:</span> {ev.session_id}</div>
                                {ev.order_id && <div><span className="text-zinc-500">order_id:</span> {ev.order_id}</div>}
                                {ev.error_message && <div><span className="text-zinc-500">error:</span> <span className="text-red-400">{ev.error_message}</span></div>}
                                {ev.error_code && <div><span className="text-zinc-500">error_code:</span> {ev.error_code}</div>}
                                {ev.field_errors && (
                                  <div><span className="text-zinc-500">field_errors:</span> <span className="text-amber-400">{JSON.stringify(ev.field_errors)}</span></div>
                                )}
                                {ev.metadata && (
                                  <div><span className="text-zinc-500">metadata:</span> {JSON.stringify(ev.metadata)}</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => fetchWidgetEvents(widgetEventsPage - 1)}
                disabled={widgetEventsPage === 0 || isLoadingEvents}
                className="px-3 py-1.5 bg-zinc-700 text-zinc-200 rounded text-sm disabled:opacity-40 hover:bg-zinc-600 transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-zinc-500">
                Pagina {widgetEventsPage + 1} din {Math.max(1, Math.ceil(widgetEventsTotal / 50))}
              </span>
              <button
                onClick={() => fetchWidgetEvents(widgetEventsPage + 1)}
                disabled={(widgetEventsPage + 1) * 50 >= widgetEventsTotal || isLoadingEvents}
                className="px-3 py-1.5 bg-zinc-700 text-zinc-200 rounded text-sm disabled:opacity-40 hover:bg-zinc-600 transition-colors"
              >
                Următor →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-md">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Organization States</h3>
        <ul className="text-sm text-blue-300 space-y-1">
          <li><strong className="text-amber-300">Pending:</strong> New registrations waiting for first activation</li>
          <li><strong className="text-emerald-300">Active:</strong> Organization is operational, users can log in</li>
          <li><strong className="text-red-300">Suspended:</strong> Intentionally deactivated, users cannot log in</li>
          <li><strong className="text-purple-300">Superadmin:</strong> Protected organizations that cannot be suspended</li>
        </ul>
        <p className="text-xs text-blue-400/70 mt-2">
          Note: When an active organization is suspended, it will appear in the Suspended section (not Pending).
        </p>
      </div>
    </div>
  );
}
