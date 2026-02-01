"use client";

import { useState, useEffect, useCallback } from "react";
import ConfirmModal from "../../components/ConfirmModal";

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
  is_active: boolean;
  created_at: string;
}

export default function FBSettingsPage() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<FacebookPage | null>(null);
  const [formData, setFormData] = useState({ pageName: "", pageId: "", pageAccessToken: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/comments/pages");
      if (!res.ok) throw new Error("Failed to fetch pages");
      const data = await res.json();
      setPages(data.pages);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const openAddModal = () => {
    setEditingPage(null);
    setFormData({ pageName: "", pageId: "", pageAccessToken: "" });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (page: FacebookPage) => {
    setEditingPage(page);
    setFormData({
      pageName: page.page_name,
      pageId: page.page_id,
      pageAccessToken: "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.pageName.trim() || !formData.pageId.trim()) {
      setFormError("Page name and Page ID are required");
      return;
    }

    if (!editingPage && !formData.pageAccessToken.trim()) {
      setFormError("Access token is required for new pages");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingPage) {
        // Update
        const body: Record<string, any> = { pageName: formData.pageName };
        if (formData.pageAccessToken.trim()) {
          body.pageAccessToken = formData.pageAccessToken;
        }

        const res = await fetch(`/api/comments/pages/${editingPage.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update page");
        }
      } else {
        // Create
        const res = await fetch("/api/comments/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add page");
        }
      }

      setShowModal(false);
      fetchPages();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePageId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/pages/${deletePageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete page");
      }

      setDeletePageId(null);
      fetchPages();
    } catch (err: any) {
      setError(err.message);
      setDeletePageId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (page: FacebookPage) => {
    try {
      const res = await fetch(`/api/comments/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !page.is_active }),
      });

      if (!res.ok) throw new Error("Failed to update page");
      fetchPages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Facebook Pages</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure Facebook pages for comment moderation
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Page
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-blue-500 rounded-full mx-auto"></div>
          <p className="text-zinc-400 mt-4 text-sm">Loading pages...</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
          <p className="text-zinc-400 text-lg mb-2">No Facebook pages configured</p>
          <p className="text-zinc-500 text-sm mb-6">
            Add a Facebook page to start moderating comments
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Your First Page
          </button>
        </div>
      ) : (
        /* Pages Table */
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                  Page Name
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                  Page ID
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-zinc-750">
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    {page.page_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400 font-mono">
                    {page.page_id}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(page)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        page.is_active
                          ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/50"
                          : "bg-zinc-700 text-zinc-400 border border-zinc-600 hover:bg-zinc-600"
                      }`}
                    >
                      {page.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(page)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletePageId(page.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-w-md w-full">
            <div className="p-6 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">
                {editingPage ? "Edit Facebook Page" : "Add Facebook Page"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Page Name
                </label>
                <input
                  type="text"
                  value={formData.pageName}
                  onChange={(e) => setFormData({ ...formData, pageName: e.target.value })}
                  placeholder="e.g. My Business Page"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Facebook Page ID
                </label>
                <input
                  type="text"
                  value={formData.pageId}
                  onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
                  placeholder="e.g. 123456789012345"
                  disabled={!!editingPage}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {editingPage && (
                  <p className="text-xs text-zinc-500 mt-1">Page ID cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Page Access Token
                </label>
                <textarea
                  value={formData.pageAccessToken}
                  onChange={(e) => setFormData({ ...formData, pageAccessToken: e.target.value })}
                  placeholder={editingPage ? "Leave empty to keep current token" : "Paste your Page Access Token here"}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Generate from Facebook Business Settings or Graph API Explorer
                </p>
              </div>
            </div>

            <div className="p-6 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSaving ? "Saving..." : editingPage ? "Update" : "Add Page"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletePageId}
        onClose={() => setDeletePageId(null)}
        onConfirm={handleDelete}
        title="Delete Facebook Page"
        message="Are you sure you want to delete this Facebook page? You will no longer be able to moderate comments from this page."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        isProcessing={isDeleting}
      />
    </div>
  );
}
