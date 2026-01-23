"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isPending: boolean;
  isSuperadmin: boolean;
  memberCount: number;
  owner: { email: string; name: string } | null;
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

  // Check access
  useEffect(() => {
    if (status === "loading") return;

    const userRole = (session?.user as any)?.activeRole;
    const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;

    if (userRole !== "owner" || !isSuperadminOrg) {
      router.push("/admin/orders");
    }
  }, [session, status, router]);

  // Load organizations
  useEffect(() => {
    loadOrganizations();
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
    } catch (error) {
      console.error("Error loading organizations:", error);
      setMessage({ type: "error", text: "Failed to load organizations" });
    } finally {
      setIsLoading(false);
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
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Created</th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-zinc-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b border-zinc-700 hover:bg-zinc-700/30 transition-colors">
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
                        <div className="flex flex-col">
                          <span className="text-white text-sm">{org.owner.name}</span>
                          <span className="text-zinc-400 text-xs">{org.owner.email}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-sm italic">No owner</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-zinc-300">{org.memberCount}</span>
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
                      <div className="flex justify-end">
                        {org.isSuperadmin ? (
                          <span className="text-sm text-zinc-500 italic">Protected</span>
                        ) : (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
