"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { OrganizationMember, UserRole } from "@/lib/types";

function roleBadgeClass(role: UserRole): string {
  switch (role) {
    case "owner":         return "badge badge-purple";
    case "admin":         return "badge badge-blue";
    case "store_manager": return "badge badge-green";
    default:              return "badge badge-zinc";
  }
}

function roleLabel(role: UserRole): string {
  switch (role) {
    case "owner":         return "Owner";
    case "admin":         return "Administrator";
    case "store_manager": return "Store Manager";
    default:              return role;
  }
}

function roleHint(role: UserRole): string {
  switch (role) {
    case "admin":         return "Acces complet la toate funcționalitățile, exceptând gestionarea echipei";
    case "store_manager": return "Poate gestiona comenzi și vizualiza clienți (doar citire)";
    default:              return "";
  }
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/team/members");
      if (!response.ok) throw new Error("Failed to load team members");
      const data = await response.json();
      setMembers(data.members || []);
    } catch {
      setMessage({ type: "error", text: "Eroare la încărcarea membrilor echipei" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleActive(memberId: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/team/members/${memberId}/toggle-active`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || "Failed to update user status"); }
      setMessage({ type: "success", text: `Utilizator ${!currentStatus ? "activat" : "dezactivat"} cu succes` });
      await loadMembers();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Eroare la actualizarea statusului" });
    }
  }

  async function handleDeleteMember() {
    if (!selectedMember) return;
    try {
      const response = await fetch(`/api/team/members/${selectedMember.id}`, { method: "DELETE" });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || "Failed to delete user"); }
      setMessage({ type: "success", text: "Utilizator șters cu succes" });
      setShowDeleteConfirm(false);
      setSelectedMember(null);
      await loadMembers();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Eroare la ștergerea utilizatorului" });
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Echipă</h1>
          <p className="page-subtitle">Gestionează utilizatorii și rolurile din organizație</p>
        </div>
        <button onClick={() => setShowAddUserModal(true)} className="btn btn-primary shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adaugă utilizator
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`card p-4 text-sm ${
          message.type === "success" ? "border-green-700/60 text-green-400" : "border-red-800/60 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Members table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-700/60 flex items-center justify-between">
          <h2 className="section-title">Membri echipă</h2>
          <span className="text-xs text-muted">{members.length} {members.length === 1 ? "membru" : "membri"}</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500 mb-4" />
            <p className="text-muted text-sm">Se încarcă membrii echipei...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-10 w-10 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-muted text-sm">Niciun membru în echipă.</p>
            <p className="text-faint text-xs mt-1">Apasă „Adaugă utilizator" pentru a invita primul membru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Utilizator</th>
                  <th>Rol</th>
                  <th>Creat de</th>
                  <th>Status</th>
                  <th>Creat</th>
                  <th className="text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="font-medium text-white text-sm">{member.user?.name || member.user?.email}</div>
                      <div className="text-xs text-muted">{member.user?.email}</div>
                    </td>
                    <td>
                      <span className={roleBadgeClass(member.role)}>{roleLabel(member.role)}</span>
                    </td>
                    <td>
                      {member.creator
                        ? <span className="text-xs text-muted">{member.creator.email}</span>
                        : <span className="text-xs text-faint italic">Înregistrat singur</span>}
                    </td>
                    <td>
                      {member.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-green-400 text-xs">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                          Activ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-zinc-500 text-xs">
                          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                          Inactiv
                        </span>
                      )}
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(member.createdAt).toLocaleDateString("ro-RO")}
                    </td>
                    <td className="text-right">
                      {member.role !== "owner" ? (
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => { setSelectedMember(member); setShowEditUserModal(true); }}
                            className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded transition-colors"
                            title="Editează"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggleActive(member.id, member.isActive)}
                            className={`p-1.5 rounded transition-colors ${
                              member.isActive
                                ? "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/60"
                                : "text-green-400 hover:bg-green-900/20"
                            }`}
                            title={member.isActive ? "Dezactivează" : "Activează"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {member.isActive ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => { setSelectedMember(member); setShowDeleteConfirm(true); }}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            title="Șterge"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-faint italic">Owner</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role permissions info */}
      <div className="card p-4 border-blue-700/40">
        <h3 className="section-title text-blue-300 mb-2">Permisiuni roluri</h3>
        <ul className="text-sm text-blue-300/80 space-y-1">
          <li><strong className="text-blue-200">Owner:</strong> Acces complet la toate funcționalitățile, inclusiv gestionarea echipei</li>
          <li><strong className="text-blue-200">Administrator:</strong> Poate gestiona comenzi, clienți, produse, magazine, landing pages și setări</li>
          <li><strong className="text-blue-200">Store Manager:</strong> Poate gestiona comenzi parțiale și vizualiza clienți (doar citire)</li>
        </ul>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => { setShowAddUserModal(false); setMessage({ type: "success", text: "Utilizator creat cu succes" }); loadMembers(); }}
          onError={(e) => setMessage({ type: "error", text: e })}
        />
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedMember && (
        <EditUserModal
          member={selectedMember}
          onClose={() => { setShowEditUserModal(false); setSelectedMember(null); }}
          onSuccess={() => { setShowEditUserModal(false); setSelectedMember(null); setMessage({ type: "success", text: "Utilizator actualizat cu succes" }); loadMembers(); }}
          onError={(e) => setMessage({ type: "error", text: e })}
        />
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && selectedMember && (
        <DeleteConfirmDialog
          member={selectedMember}
          onClose={() => { setShowDeleteConfirm(false); setSelectedMember(null); }}
          onConfirm={handleDeleteMember}
        />
      )}
    </div>
  );
}

// ── Shared modal field ──────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </div>
  );
}

// ── Add User Modal ──────────────────────────────────────────────────────────
interface AddUserModalProps { onClose: () => void; onSuccess: () => void; onError: (e: string) => void; }

function AddUserModal({ onClose, onSuccess, onError }: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("store_manager");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Failed to create user"); }
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-zinc-700/60">
            <h2 className="section-title">Utilizator nou</h2>
            <p className="text-muted text-xs mt-0.5">Creează un cont nou pentru un membru al echipei</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <Field label="Nume complet">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="input" placeholder="Ion Popescu" required autoFocus />
            </Field>
            <Field label="Adresă email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder="utilizator@exemplu.com" required />
            </Field>
            <Field label="Parolă" hint="8–64 de caractere">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder="8–64 caractere" minLength={8} maxLength={64} required />
            </Field>
            <Field label="Rol" hint={roleHint(role)}>
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input" required>
                <option value="store_manager">Store Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>
          </div>

          <div className="px-6 py-4 border-t border-zinc-700/60 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary">
              Anulează
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Se creează...</>
              ) : "Creează utilizator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit User Modal ─────────────────────────────────────────────────────────
interface EditUserModalProps { member: OrganizationMember; onClose: () => void; onSuccess: () => void; onError: (e: string) => void; }

function EditUserModal({ member, onClose, onSuccess, onError }: EditUserModalProps) {
  const [name, setName] = useState(member.user?.name || "");
  const [email, setEmail] = useState(member.user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(member.role);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: password || undefined, role }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Failed to update user"); }
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-zinc-700/60">
            <h2 className="section-title">Editează utilizator</h2>
            <p className="text-muted text-xs mt-0.5">Actualizează informațiile utilizatorului</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <Field label="Nume complet">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="input" placeholder="Ion Popescu" required autoFocus />
            </Field>
            <Field label="Adresă email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder="utilizator@exemplu.com" required />
            </Field>
            <Field label="Parolă nouă (opțional)" hint="Lasă gol pentru a păstra parola curentă">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder="Lasă gol pentru a păstra parola curentă" minLength={8} maxLength={64} />
            </Field>
            <Field label="Rol" hint={roleHint(role)}>
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input" required>
                <option value="store_manager">Store Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>
          </div>

          <div className="px-6 py-4 border-t border-zinc-700/60 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary">
              Anulează
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Se actualizează...</>
              ) : "Actualizează utilizator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Dialog ───────────────────────────────────────────────────
interface DeleteConfirmDialogProps { member: OrganizationMember; onClose: () => void; onConfirm: () => void; }

function DeleteConfirmDialog({ member, onClose, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm shadow-2xl">
        <div className="px-6 py-5 border-b border-zinc-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="section-title">Șterge utilizator</h2>
              <p className="text-red-400/70 text-xs mt-0.5">Această acțiune nu poate fi anulată</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-zinc-300 text-sm">
            Ești sigur că vrei să ștergi <strong className="text-white">{member.user?.name || member.user?.email}</strong>?
          </p>
          <p className="text-muted text-xs mt-2">
            Utilizatorul va pierde accesul la organizație și la toate datele asociate.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-zinc-700/60 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Anulează
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-danger">
            Șterge utilizator
          </button>
        </div>
      </div>
    </div>
  );
}
