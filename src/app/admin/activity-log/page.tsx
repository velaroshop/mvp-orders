"use client";

import { useState, useEffect } from "react";

interface AuditEntry {
  id: string;
  user_email: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, { old: any; new: any }>;
  metadata: Record<string, any>;
  created_at: string;
}

const ENTITY_LABELS: Record<string, string> = {
  landing_page: "Landing Page",
  product: "Produs",
  upsell: "Upsell",
  store: "Store",
  team_member: "Team",
};

const ENTITY_COLORS: Record<string, string> = {
  landing_page: "bg-blue-900/30 text-blue-300",
  product: "bg-purple-900/30 text-purple-300",
  upsell: "bg-orange-900/30 text-orange-300",
  store: "bg-emerald-900/30 text-emerald-300",
  team_member: "bg-cyan-900/30 text-cyan-300",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Creat",
  update: "Modificat",
  delete: "Șters",
  status_change: "Status schimbat",
  toggle_active: "Activare/Dezactivare",
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-emerald-400",
  update: "text-yellow-400",
  delete: "text-red-400",
  status_change: "text-blue-400",
  toggle_active: "text-orange-400",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 30;
  const totalPages = Math.ceil(total / limit);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (entityFilter) params.append("entity_type", entityFilter);

      const response = await fetch(`/api/activity-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatValue(val: any): string {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "Da" : "Nu";
    return String(val);
  }

  function getEntityName(entry: AuditEntry): string {
    return entry.metadata?.name || entry.metadata?.title || entry.metadata?.email || entry.entity_id.substring(0, 8);
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <main className="max-w-7xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">Activity Log</h1>
          <p className="text-zinc-400 mt-1">Istoric modificări în aplicație</p>
        </header>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Toate zonele</option>
            <option value="landing_page">Landing Pages</option>
            <option value="product">Produse</option>
            <option value="upsell">Upsells</option>
            <option value="store">Store</option>
            <option value="team_member">Team</option>
          </select>

          <span className="text-sm text-zinc-400">
            {total} {total === 1 ? "înregistrare" : "înregistrări"}
          </span>
        </div>

        {/* Table */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400">Se încarcă...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">Nu există înregistrări.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-2.5" colSpan={5}>
                    <div className="flex items-center gap-4 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                      <div className="w-36 shrink-0">Dată</div>
                      <div className="w-44 shrink-0">Utilizator</div>
                      <div className="w-24 shrink-0">Zonă</div>
                      <div className="w-28 shrink-0">Acțiune</div>
                      <div className="flex-1">Entitate</div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {logs.map((entry) => (
                  <tr key={entry.id}>
                    <td
                      className="px-4 py-3 cursor-pointer hover:bg-zinc-700/50 transition-colors"
                      colSpan={5}
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Date */}
                        <div className="text-xs text-zinc-400 w-36 shrink-0">
                          {formatDate(entry.created_at)}
                        </div>

                        {/* User */}
                        <div className="text-xs text-zinc-300 w-44 shrink-0 truncate" title={entry.user_email}>
                          {entry.user_email}
                        </div>

                        {/* Entity type badge */}
                        <div className="w-24 shrink-0">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${ENTITY_COLORS[entry.entity_type] || "bg-zinc-700 text-zinc-300"}`}>
                            {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                          </span>
                        </div>

                        {/* Action */}
                        <div className={`text-xs font-medium w-28 shrink-0 ${ACTION_COLORS[entry.action] || "text-zinc-300"}`}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </div>

                        {/* Entity name */}
                        <div className="text-xs text-zinc-300 truncate flex-1">
                          {getEntityName(entry)}
                        </div>

                        {/* Expand indicator */}
                        {Object.keys(entry.changes).length > 0 && (
                          <div className="text-zinc-500 text-xs shrink-0">
                            {expandedId === entry.id ? "▼" : "▶"} {Object.keys(entry.changes).length} câmpuri
                          </div>
                        )}
                      </div>

                      {/* Expanded changes */}
                      {expandedId === entry.id && Object.keys(entry.changes).length > 0 && (
                        <div className="mt-3 ml-36 p-3 bg-zinc-900 rounded-lg border border-zinc-700">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-zinc-500">
                                <th className="text-left py-1 pr-4 font-medium">Câmp</th>
                                <th className="text-left py-1 pr-4 font-medium">Valoare veche</th>
                                <th className="text-left py-1 font-medium">Valoare nouă</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(entry.changes).map(([field, change]) => (
                                <tr key={field} className="border-t border-zinc-800">
                                  <td className="py-1.5 pr-4 text-zinc-400 font-medium">{field}</td>
                                  <td className="py-1.5 pr-4 text-red-400/70">{formatValue(change.old)}</td>
                                  <td className="py-1.5 text-emerald-400/70">{formatValue(change.new)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Pagina {page} din {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Următor →
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
