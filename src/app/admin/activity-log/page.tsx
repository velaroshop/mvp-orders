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
  product:      "Produs",
  upsell:       "Upsell",
  store:        "Magazin",
  team_member:  "Echipă",
};

function entityBadgeClass(type: string) {
  const map: Record<string, string> = {
    landing_page: "badge badge-blue",
    product:      "badge badge-purple",
    upsell:       "badge badge-orange",
    store:        "badge badge-green",
    team_member:  "badge badge-zinc",
  };
  return map[type] || "badge badge-zinc";
}

const ACTION_LABELS: Record<string, string> = {
  create:        "Creat",
  update:        "Modificat",
  delete:        "Șters",
  status_change: "Status schimbat",
  toggle_active: "Activare/Dezactivare",
};

function actionColorClass(action: string) {
  const map: Record<string, string> = {
    create:        "text-green-400",
    update:        "text-yellow-400",
    delete:        "text-red-400",
    status_change: "text-indigo-400",
    toggle_active: "text-orange-400",
  };
  return map[action] || "text-muted";
}

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
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
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

  useEffect(() => { fetchLogs(); }, [page, entityFilter]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
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
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Activity Log</h1>
        <p className="page-subtitle">Istoric modificări în aplicație</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="input w-48"
          >
            <option value="">Toate zonele</option>
            <option value="landing_page">Landing Pages</option>
            <option value="product">Produse</option>
            <option value="upsell">Upsells</option>
            <option value="store">Magazin</option>
            <option value="team_member">Echipă</option>
          </select>
          <span className="text-sm text-faint">
            {total} {total === 1 ? "înregistrare" : "înregistrări"}
          </span>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card p-8 text-center">
          <p className="text-muted text-sm">Se încarcă...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted">Nu există înregistrări.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-faint uppercase tracking-widest w-36">Dată</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-faint uppercase tracking-widest w-44">Utilizator</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-faint uppercase tracking-widest w-28">Zonă</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-faint uppercase tracking-widest w-32">Acțiune</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-faint uppercase tracking-widest">Entitate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-muted w-36 shrink-0">{formatDate(entry.created_at)}</div>
                        <div className="text-xs text-white w-44 shrink-0 truncate" title={entry.user_email}>
                          {entry.user_email}
                        </div>
                        <div className="w-28 shrink-0">
                          <span className={entityBadgeClass(entry.entity_type)}>
                            {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                          </span>
                        </div>
                        <div className={`text-xs font-medium w-32 shrink-0 ${actionColorClass(entry.action)}`}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </div>
                        <div className="text-xs text-muted truncate flex-1">{getEntityName(entry)}</div>
                        {Object.keys(entry.changes).length > 0 && (
                          <div className="text-faint text-xs shrink-0">
                            {expandedId === entry.id ? "▼" : "▶"} {Object.keys(entry.changes).length} câmpuri
                          </div>
                        )}
                      </div>

                      {/* Expanded changes */}
                      {expandedId === entry.id && Object.keys(entry.changes).length > 0 && (
                        <div className="mt-3 ml-36 p-3 bg-zinc-900 rounded-lg border border-zinc-700/60">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="text-left py-1 pr-4 font-medium text-faint">Câmp</th>
                                <th className="text-left py-1 pr-4 font-medium text-faint">Valoare veche</th>
                                <th className="text-left py-1 font-medium text-faint">Valoare nouă</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(entry.changes).map(([field, change]) => (
                                <tr key={field} className="border-t border-zinc-800">
                                  <td className="py-1.5 pr-4 text-muted font-medium">{field}</td>
                                  <td className="py-1.5 pr-4 text-red-400/70">{formatValue(change.old)}</td>
                                  <td className="py-1.5 text-green-400/70">{formatValue(change.new)}</td>
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
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-faint">Pagina {page} din {totalPages}</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage(1)} disabled={page === 1} className="btn btn-sm btn-secondary">«</button>
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn btn-sm btn-secondary">← Anterior</button>
            <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="btn btn-sm btn-secondary">Următor →</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn btn-sm btn-secondary">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
