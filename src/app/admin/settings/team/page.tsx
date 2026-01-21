"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { OrganizationMember, UserRole } from "@/lib/types";

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load team members
  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/team/members");

      if (!response.ok) {
        throw new Error("Failed to load team members");
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Error loading team members:", error);
      setMessage({ type: "error", text: "Failed to load team members" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleActive(memberId: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/team/members/${memberId}/toggle-active`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user status");
      }

      setMessage({
        type: "success",
        text: `User ${!currentStatus ? "activated" : "deactivated"} successfully`
      });

      // Reload members
      await loadMembers();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update user status",
      });
    }
  }

  function getRoleBadgeColor(role: UserRole) {
    switch (role) {
      case "owner":
        return "bg-purple-900/30 text-purple-300 border-purple-700";
      case "admin":
        return "bg-blue-900/30 text-blue-300 border-blue-700";
      case "store_manager":
        return "bg-emerald-900/30 text-emerald-300 border-emerald-700";
      default:
        return "bg-zinc-700 text-zinc-300 border-zinc-600";
    }
  }

  function getRoleLabel(role: UserRole) {
    switch (role) {
      case "owner":
        return "Owner";
      case "admin":
        return "Administrator";
      case "store_manager":
        return "Store Manager";
      default:
        return role;
    }
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Management</h1>
          <p className="text-zinc-400 mt-2">
            Manage users and their roles in your organization
          </p>
        </div>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
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

      {/* Team Members List */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700">
        <div className="p-6 border-b border-zinc-700">
          <h2 className="text-xl font-semibold text-white">Team Members</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <p className="text-zinc-400 mt-4">Loading team members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-zinc-400 mt-4">No team members yet</p>
            <p className="text-zinc-500 text-sm mt-2">Click "Add User" to invite your first team member</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">User</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Role</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Created By</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-zinc-300">Created</th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-zinc-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-zinc-700 hover:bg-zinc-700/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          {member.user?.name || member.user?.email}
                        </span>
                        <span className="text-sm text-zinc-400">{member.user?.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {member.creator ? (
                        <span className="text-sm text-zinc-400">{member.creator.email}</span>
                      ) : (
                        <span className="text-sm text-zinc-500 italic">Self-registered</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {member.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-zinc-500 text-sm">
                          <span className="w-2 h-2 bg-zinc-500 rounded-full"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-zinc-400">
                        {new Date(member.createdAt).toLocaleDateString("ro-RO")}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        {member.role !== "owner" ? (
                          <>
                            <button
                              onClick={() => {/* TODO: Edit member */}}
                              className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-md transition-colors"
                              title="Edit user"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleToggleActive(member.id, member.isActive)}
                              className={`p-2 rounded-md transition-colors ${
                                member.isActive
                                  ? "text-zinc-400 hover:bg-zinc-700"
                                  : "text-emerald-400 hover:bg-emerald-900/20"
                              }`}
                              title={member.isActive ? "Deactivate user" : "Activate user"}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {member.isActive ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                            </button>
                            <button
                              onClick={() => {/* TODO: Delete member */}}
                              className="p-2 text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                              title="Delete user"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-1 text-sm text-zinc-500 italic">Owner</span>
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
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Role Permissions</h3>
        <ul className="text-sm text-blue-300 space-y-1">
          <li><strong>Owner:</strong> Full access to all features, including team management</li>
          <li><strong>Administrator:</strong> Can manage orders, customers, products, stores, landing pages, and settings</li>
          <li><strong>Store Manager:</strong> Can view and manage orders, partial orders, and view customers (read-only)</li>
        </ul>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            setShowAddUserModal(false);
            setMessage({ type: "success", text: "User created successfully" });
            loadMembers();
          }}
          onError={(error) => {
            setMessage({ type: "error", text: error });
          }}
        />
      )}
    </div>
  );
}

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-w-md w-full">
        <form onSubmit={handleSubmit}>
          {/* Modal Header */}
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-2xl font-bold text-white">Add New User</h2>
            <p className="text-zinc-400 text-sm mt-1">Create a new team member account</p>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="John Doe"
                required
                autoFocus
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-400"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
              <p className="text-xs text-zinc-400 mt-1">Minimum 8 characters</p>
            </div>

            {/* Role Select */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-zinc-300 mb-1">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                required
              >
                <option value="store_manager">Store Manager</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="text-xs text-zinc-400 mt-1">
                {role === "admin"
                  ? "Full access to all features except team management"
                  : "Can manage orders and view customers (read-only)"}
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? (
                <>
                  <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
