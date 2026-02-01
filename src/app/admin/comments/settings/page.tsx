"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ConfirmModal from "../../components/ConfirmModal";

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
  is_active: boolean;
  created_at: string;
}

interface AdPost {
  id: string;
  post_id: string;
  post_name: string;
  is_active: boolean;
  ad_account?: string;
  campaign?: string;
  adset?: string;
  created_at: string;
}

export default function FBSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Superadmin access check
  useEffect(() => {
    if (status === "loading") return;
    const userRole = (session?.user as any)?.activeRole;
    const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;
    if (userRole !== "owner" || !isSuperadminOrg) {
      router.push("/admin/orders");
    }
  }, [session, status, router]);

  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page modal state
  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState<FacebookPage | null>(null);
  const [pageFormData, setPageFormData] = useState({ pageName: "", pageId: "", pageAccessToken: "" });
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [pageFormError, setPageFormError] = useState<string | null>(null);

  // Delete page modal
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [isDeletingPage, setIsDeletingPage] = useState(false);

  // Expanded page (show ads)
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [adPosts, setAdPosts] = useState<Record<string, AdPost[]>>({});
  const [isLoadingAds, setIsLoadingAds] = useState<string | null>(null);

  // Ad modal state
  const [showAdModal, setShowAdModal] = useState(false);
  const [adModalPageId, setAdModalPageId] = useState<string | null>(null);
  const [adFormData, setAdFormData] = useState({ postId: "", postName: "", adAccount: "", campaign: "", adset: "" });
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [adFormError, setAdFormError] = useState<string | null>(null);

  // Delete ad modal
  const [deleteAdInfo, setDeleteAdInfo] = useState<{ pageId: string; adId: string } | null>(null);
  const [isDeletingAd, setIsDeletingAd] = useState(false);

  // Test connection
  const [testingPageId, setTestingPageId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string; checks?: { name: string; ok: boolean }[]; hint?: string } | null>>({});
  const [testingPostId, setTestingPostId] = useState<string | null>(null);
  const [postTestResult, setPostTestResult] = useState<Record<string, { success: boolean; message: string; hint?: string } | null>>({});

  // ---- Pages ----

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

  const openAddPageModal = () => {
    setEditingPage(null);
    setPageFormData({ pageName: "", pageId: "", pageAccessToken: "" });
    setPageFormError(null);
    setShowPageModal(true);
  };

  const openEditPageModal = (page: FacebookPage) => {
    setEditingPage(page);
    setPageFormData({
      pageName: page.page_name,
      pageId: page.page_id,
      pageAccessToken: "",
    });
    setPageFormError(null);
    setShowPageModal(true);
  };

  const handleSavePage = async () => {
    if (!pageFormData.pageName.trim() || !pageFormData.pageId.trim()) {
      setPageFormError("Page name and Page ID are required");
      return;
    }

    if (!editingPage && !pageFormData.pageAccessToken.trim()) {
      setPageFormError("Access token is required for new pages");
      return;
    }

    setIsSavingPage(true);
    setPageFormError(null);

    try {
      if (editingPage) {
        const body: Record<string, any> = { pageName: pageFormData.pageName };
        if (pageFormData.pageAccessToken.trim()) {
          body.pageAccessToken = pageFormData.pageAccessToken;
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
        const res = await fetch("/api/comments/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pageFormData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add page");
        }
      }

      setShowPageModal(false);
      fetchPages();
    } catch (err: any) {
      setPageFormError(err.message);
    } finally {
      setIsSavingPage(false);
    }
  };

  const handleDeletePage = async () => {
    if (!deletePageId) return;

    setIsDeletingPage(true);
    try {
      const res = await fetch(`/api/comments/pages/${deletePageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete page");
      }

      setDeletePageId(null);
      if (expandedPageId === deletePageId) setExpandedPageId(null);
      fetchPages();
    } catch (err: any) {
      setError(err.message);
      setDeletePageId(null);
    } finally {
      setIsDeletingPage(false);
    }
  };

  const togglePageActive = async (page: FacebookPage) => {
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

  // ---- Ad Posts ----

  const fetchAds = useCallback(async (pageId: string) => {
    setIsLoadingAds(pageId);
    try {
      const res = await fetch(`/api/comments/pages/${pageId}/ads`);
      if (!res.ok) throw new Error("Failed to fetch ad posts");
      const data = await res.json();
      setAdPosts((prev) => ({ ...prev, [pageId]: data.ads }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingAds(null);
    }
  }, []);

  const toggleExpandPage = (pageId: string) => {
    if (expandedPageId === pageId) {
      setExpandedPageId(null);
    } else {
      setExpandedPageId(pageId);
      if (!adPosts[pageId]) {
        fetchAds(pageId);
      }
    }
  };

  const openAddAdModal = (pageId: string) => {
    setAdModalPageId(pageId);
    setAdFormData({ postId: "", postName: "", adAccount: "", campaign: "", adset: "" });
    setAdFormError(null);
    setShowAdModal(true);
  };

  const handleSaveAd = async () => {
    if (!adModalPageId) return;

    if (!adFormData.postId.trim() || !adFormData.postName.trim()) {
      setAdFormError("Post ID and name are required");
      return;
    }

    setIsSavingAd(true);
    setAdFormError(null);

    try {
      const res = await fetch(`/api/comments/pages/${adModalPageId}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: adFormData.postId,
          postName: adFormData.postName,
          adAccount: adFormData.adAccount || undefined,
          campaign: adFormData.campaign || undefined,
          adset: adFormData.adset || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add ad post");
      }

      setShowAdModal(false);
      fetchAds(adModalPageId);
    } catch (err: any) {
      setAdFormError(err.message);
    } finally {
      setIsSavingAd(false);
    }
  };

  const handleDeleteAd = async () => {
    if (!deleteAdInfo) return;

    setIsDeletingAd(true);
    try {
      const res = await fetch(
        `/api/comments/pages/${deleteAdInfo.pageId}/ads/${deleteAdInfo.adId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete ad post");
      }

      setDeleteAdInfo(null);
      fetchAds(deleteAdInfo.pageId);
    } catch (err: any) {
      setError(err.message);
      setDeleteAdInfo(null);
    } finally {
      setIsDeletingAd(false);
    }
  };

  // ---- Test Connection ----

  const handleTestPage = async (dbPageId: string) => {
    setTestingPageId(dbPageId);
    setTestResult((prev) => ({ ...prev, [dbPageId]: null }));

    try {
      const res = await fetch(`/api/comments/pages/${dbPageId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult((prev) => ({ ...prev, [dbPageId]: data }));
      } else {
        setTestResult((prev) => ({
          ...prev,
          [dbPageId]: { success: false, message: data.error || "Test failed" },
        }));
      }
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [dbPageId]: { success: false, message: err.message },
      }));
    } finally {
      setTestingPageId(null);
    }
  };

  const handleTestPost = async (dbPageId: string, fbPostId: string, adId: string) => {
    setTestingPostId(adId);
    setPostTestResult((prev) => ({ ...prev, [adId]: null }));

    try {
      const res = await fetch(`/api/comments/pages/${dbPageId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: fbPostId }),
      });

      const data = await res.json();
      if (res.ok) {
        setPostTestResult((prev) => ({ ...prev, [adId]: data }));
      } else {
        setPostTestResult((prev) => ({
          ...prev,
          [adId]: { success: false, message: data.error || "Test failed" },
        }));
      }
    } catch (err: any) {
      setPostTestResult((prev) => ({
        ...prev,
        [adId]: { success: false, message: err.message },
      }));
    } finally {
      setTestingPostId(null);
    }
  };

  const toggleAdActive = async (pageId: string, ad: AdPost) => {
    try {
      const res = await fetch(`/api/comments/pages/${pageId}/ads/${ad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ad.is_active }),
      });

      if (!res.ok) throw new Error("Failed to update ad post");
      fetchAds(pageId);
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
            Configure Facebook pages and ad posts for comment moderation
          </p>
        </div>
        <button
          onClick={openAddPageModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Page
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline text-red-400 hover:text-red-300">
            Dismiss
          </button>
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
            onClick={openAddPageModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Your First Page
          </button>
        </div>
      ) : (
        /* Pages List */
        <div className="space-y-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
            >
              {/* Page header */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleExpandPage(page.id)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {expandedPageId === page.id ? "▼" : "▶"}
                  </button>
                  <div>
                    <h3 className="text-sm font-medium text-white">{page.page_name}</h3>
                    <p className="text-xs text-zinc-500 font-mono">{page.page_id}</p>
                  </div>
                  <button
                    onClick={() => togglePageActive(page)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      page.is_active
                        ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/50"
                        : "bg-zinc-700 text-zinc-400 border border-zinc-600 hover:bg-zinc-600"
                    }`}
                  >
                    {page.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestPage(page.id)}
                    disabled={testingPageId === page.id}
                    className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
                  >
                    {testingPageId === page.id ? "Testing..." : "Test"}
                  </button>
                  <button
                    onClick={() => openEditPageModal(page)}
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
              </div>

              {/* Test result */}
              {testResult[page.id] && (
                <div
                  className={`mx-6 mb-4 rounded-lg p-3 text-xs ${
                    testResult[page.id]!.success
                      ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
                      : "bg-red-900/30 border border-red-700 text-red-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{testResult[page.id]!.message}</p>
                      {testResult[page.id]!.hint && (
                        <p className="text-zinc-400">{testResult[page.id]!.hint}</p>
                      )}
                      {testResult[page.id]!.checks && testResult[page.id]!.checks!.length > 0 && (
                        <div className="mt-1 flex items-center gap-3">
                          {testResult[page.id]!.checks!.map((check) => (
                            <span key={check.name} className={check.ok ? "text-emerald-400" : "text-red-400"}>
                              {check.ok ? "\u2713" : "\u2717"} {check.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setTestResult((prev) => ({ ...prev, [page.id]: null }))}
                      className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded: Ad Posts */}
              {expandedPageId === page.id && (
                <div className="border-t border-zinc-700 bg-zinc-850">
                  <div className="px-6 py-3 flex items-center justify-between border-b border-zinc-700/50">
                    <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Ad Posts / Reclame
                    </h4>
                    <button
                      onClick={() => openAddAdModal(page.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      + Add Ad
                    </button>
                  </div>

                  {isLoadingAds === page.id ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full mx-auto"></div>
                      <p className="text-zinc-500 mt-2 text-xs">Loading ads...</p>
                    </div>
                  ) : !adPosts[page.id] || adPosts[page.id].length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-zinc-500 text-sm">No ad posts configured</p>
                      <p className="text-zinc-600 text-xs mt-1">
                        Add ad post IDs to monitor their comments
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-700/50">
                      {adPosts[page.id].map((ad) => (
                        <div key={ad.id}>
                          <div className="px-6 py-3 flex items-center justify-between hover:bg-zinc-800/50">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-sm text-white">{ad.post_name}</p>
                                <p className="text-xs text-zinc-500 font-mono">{ad.post_id}</p>
                                {(ad.ad_account || ad.campaign || ad.adset) && (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {ad.ad_account && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{ad.ad_account}</span>
                                    )}
                                    {ad.campaign && (
                                      <>
                                        <span className="text-zinc-600 text-[10px]">/</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">{ad.campaign}</span>
                                      </>
                                    )}
                                    {ad.adset && (
                                      <>
                                        <span className="text-zinc-600 text-[10px]">/</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800/50">{ad.adset}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => toggleAdActive(page.id, ad)}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-colors ${
                                  ad.is_active
                                    ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/50"
                                    : "bg-zinc-700 text-zinc-400 border border-zinc-600 hover:bg-zinc-600"
                                }`}
                              >
                                {ad.is_active ? "Active" : "Inactive"}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTestPost(page.id, ad.post_id, ad.id)}
                                disabled={testingPostId === ad.id}
                                className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
                              >
                                {testingPostId === ad.id ? "Testing..." : "Test"}
                              </button>
                              <button
                                onClick={() => setDeleteAdInfo({ pageId: page.id, adId: ad.id })}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {/* Post test result */}
                          {postTestResult[ad.id] && (
                            <div
                              className={`mx-6 mb-3 rounded-md p-2 text-xs ${
                                postTestResult[ad.id]!.success
                                  ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
                                  : "bg-red-900/30 border border-red-700 text-red-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p>{postTestResult[ad.id]!.message}</p>
                                  {postTestResult[ad.id]!.hint && (
                                    <p className="text-zinc-400 mt-0.5">{postTestResult[ad.id]!.hint}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => setPostTestResult((prev) => ({ ...prev, [ad.id]: null }))}
                                  className="text-zinc-500 hover:text-zinc-300 shrink-0"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Page Modal */}
      {showPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-w-md w-full">
            <div className="p-6 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">
                {editingPage ? "Edit Facebook Page" : "Add Facebook Page"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {pageFormError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                  {pageFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Page Name</label>
                <input
                  type="text"
                  value={pageFormData.pageName}
                  onChange={(e) => setPageFormData({ ...pageFormData, pageName: e.target.value })}
                  placeholder="e.g. Ofertio"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Facebook Page ID</label>
                <input
                  type="text"
                  value={pageFormData.pageId}
                  onChange={(e) => setPageFormData({ ...pageFormData, pageId: e.target.value })}
                  placeholder="e.g. 556795054194964"
                  disabled={!!editingPage}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {editingPage && (
                  <p className="text-xs text-zinc-500 mt-1">Page ID cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Page Access Token</label>
                <textarea
                  value={pageFormData.pageAccessToken}
                  onChange={(e) => setPageFormData({ ...pageFormData, pageAccessToken: e.target.value })}
                  placeholder={editingPage ? "Leave empty to keep current token" : "Paste your Page Access Token here"}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
                />
              </div>
            </div>

            <div className="p-6 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
              <button
                onClick={() => setShowPageModal(false)}
                disabled={isSavingPage}
                className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePage}
                disabled={isSavingPage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSavingPage ? "Saving..." : editingPage ? "Update" : "Add Page"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-w-md w-full">
            <div className="p-6 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">Add Ad Post</h3>
            </div>

            <div className="p-6 space-y-4">
              {adFormError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                  {adFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Ad Name</label>
                <input
                  type="text"
                  value={adFormData.postName}
                  onChange={(e) => setAdFormData({ ...adFormData, postName: e.target.value })}
                  placeholder="e.g. Promo Vara 2025"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Post ID</label>
                <input
                  type="text"
                  value={adFormData.postId}
                  onChange={(e) => setAdFormData({ ...adFormData, postId: e.target.value })}
                  placeholder="e.g. 556795054194964_123456789"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Find in Ads Manager: click ad → Preview → copy Post ID from URL
                </p>
              </div>

              <div className="border-t border-zinc-700 pt-4 mt-2">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Hierarchy (optional)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Ad Account</label>
                    <input
                      type="text"
                      list="dl-ad-accounts"
                      value={adFormData.adAccount}
                      onChange={(e) => setAdFormData({ ...adFormData, adAccount: e.target.value })}
                      placeholder="e.g. Velaro"
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <datalist id="dl-ad-accounts">
                      {[...new Set((adModalPageId && adPosts[adModalPageId] || []).map(a => a.ad_account).filter(Boolean))].map(v => (
                        <option key={v} value={v!} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Campaign</label>
                    <input
                      type="text"
                      list="dl-campaigns"
                      value={adFormData.campaign}
                      onChange={(e) => setAdFormData({ ...adFormData, campaign: e.target.value })}
                      placeholder="e.g. Black Friday"
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <datalist id="dl-campaigns">
                      {[...new Set((adModalPageId && adPosts[adModalPageId] || []).map(a => a.campaign).filter(Boolean))].map(v => (
                        <option key={v} value={v!} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Ad Set</label>
                    <input
                      type="text"
                      list="dl-adsets"
                      value={adFormData.adset}
                      onChange={(e) => setAdFormData({ ...adFormData, adset: e.target.value })}
                      placeholder="e.g. Retargeting 18-35"
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <datalist id="dl-adsets">
                      {[...new Set((adModalPageId && adPosts[adModalPageId] || []).map(a => a.adset).filter(Boolean))].map(v => (
                        <option key={v} value={v!} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
              <button
                onClick={() => setShowAdModal(false)}
                disabled={isSavingAd}
                className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAd}
                disabled={isSavingAd}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSavingAd ? "Saving..." : "Add Ad"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Confirmation */}
      <ConfirmModal
        isOpen={!!deletePageId}
        onClose={() => setDeletePageId(null)}
        onConfirm={handleDeletePage}
        title="Delete Facebook Page"
        message="Are you sure you want to delete this Facebook page and all its configured ads? You will no longer be able to moderate comments from this page."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        isProcessing={isDeletingPage}
      />

      {/* Delete Ad Confirmation */}
      <ConfirmModal
        isOpen={!!deleteAdInfo}
        onClose={() => setDeleteAdInfo(null)}
        onConfirm={handleDeleteAd}
        title="Delete Ad Post"
        message="Are you sure you want to remove this ad post? You will no longer see its comments in the moderation page."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        isProcessing={isDeletingAd}
      />
    </div>
  );
}
