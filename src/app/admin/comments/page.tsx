"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ConfirmModal from "../components/ConfirmModal";

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
  is_active: boolean;
}

interface AdPost {
  id: string;
  post_id: string;
  post_name: string;
  is_active: boolean;
  ad_account?: string;
  campaign?: string;
  adset?: string;
}

interface Comment {
  id: string;
  message: string;
  authorName: string;
  authorId: string;
  createdTime: string;
  isHidden: boolean;
  replies?: Comment[];
}

type FilterType = "all" | "visible" | "hidden";

export default function CommentsPage() {
  // Pages
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [isLoadingPages, setIsLoadingPages] = useState(true);

  // Ad Posts
  const [adPosts, setAdPosts] = useState<AdPost[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null);

  // Comments
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isLoadingComments, setIsLoadingComments] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Record<string, string | null>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<FilterType>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  // Reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Delete
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk delete
  const [bulkDeleting, setBulkDeleting] = useState<string | null>(null); // adId being bulk deleted
  const [bulkProgress, setBulkProgress] = useState<{ deleted: number; total: number; failed: number } | null>(null);

  // Errors
  const [error, setError] = useState<string | null>(null);

  // Action feedback
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch pages on mount
  useEffect(() => {
    async function loadPages() {
      try {
        const res = await fetch("/api/comments/pages");
        if (!res.ok) throw new Error("Failed to fetch pages");
        const data = await res.json();
        const activePages = (data.pages || []).filter((p: FacebookPage) => p.is_active);
        setPages(activePages);
        if (activePages.length > 0) {
          setSelectedPageId(activePages[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoadingPages(false);
      }
    }
    loadPages();
  }, []);

  // Fetch ad posts when page changes
  const fetchAdPosts = useCallback(async () => {
    if (!selectedPageId) return;

    setIsLoadingAds(true);
    setError(null);
    setAdPosts([]);
    setExpandedAdId(null);
    setComments({});

    try {
      const res = await fetch(`/api/comments/pages/${selectedPageId}/ads`);
      if (!res.ok) throw new Error("Failed to fetch ad posts");
      const data = await res.json();
      const activeAds = (data.ads || []).filter((a: AdPost) => a.is_active);
      setAdPosts(activeAds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingAds(false);
    }
  }, [selectedPageId]);

  useEffect(() => {
    if (selectedPageId) {
      fetchAdPosts();
    }
  }, [selectedPageId, fetchAdPosts]);

  // Fetch comments for an ad post
  const fetchComments = async (adPostId: string, fbPostId: string) => {
    if (!selectedPageId) return;

    setIsLoadingComments(adPostId);
    try {
      const res = await fetch(
        `/api/comments/${selectedPageId}/posts/${encodeURIComponent(fbPostId)}/comments?limit=50`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch comments");
      }
      const data = await res.json();
      setComments((prev) => ({ ...prev, [adPostId]: data.comments || [] }));
      setCursors((prev) => ({ ...prev, [adPostId]: data.nextCursor }));
      setHasMore((prev) => ({ ...prev, [adPostId]: data.hasMore }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingComments(null);
    }
  };

  // Load more comments
  const loadMoreComments = async (adPostId: string, fbPostId: string) => {
    if (!selectedPageId || !cursors[adPostId]) return;

    setIsLoadingMore(adPostId);
    try {
      const res = await fetch(
        `/api/comments/${selectedPageId}/posts/${encodeURIComponent(fbPostId)}/comments?limit=50&after=${cursors[adPostId]}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch more comments");
      }
      const data = await res.json();
      setComments((prev) => ({
        ...prev,
        [adPostId]: [...(prev[adPostId] || []), ...(data.comments || [])],
      }));
      setCursors((prev) => ({ ...prev, [adPostId]: data.nextCursor }));
      setHasMore((prev) => ({ ...prev, [adPostId]: data.hasMore }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingMore(null);
    }
  };

  const toggleAd = (ad: AdPost) => {
    if (expandedAdId === ad.id) {
      setExpandedAdId(null);
    } else {
      setExpandedAdId(ad.id);
      if (!comments[ad.id]) {
        fetchComments(ad.id, ad.post_id);
      }
    }
  };

  // Hide/Unhide
  const handleToggleHide = async (comment: Comment, adId: string) => {
    try {
      const res = await fetch(`/api/comments/actions/${comment.id}/hide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fbPageId: selectedPageId, hide: !comment.isHidden }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update comment");
      }

      setComments((prev) => ({
        ...prev,
        [adId]: prev[adId].map((c) => {
          if (c.id === comment.id) return { ...c, isHidden: !c.isHidden };
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === comment.id ? { ...r, isHidden: !r.isHidden } : r
              ),
            };
          }
          return c;
        }),
      }));

      showAction("success", comment.isHidden ? "Comment unhidden" : "Comment hidden");
    } catch (err: any) {
      showAction("error", err.message);
    }
  };

  // Reply
  const handleReply = async (commentId: string, adId: string) => {
    if (!replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/comments/actions/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fbPageId: selectedPageId, message: replyText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reply");
      }

      setReplyingTo(null);
      setReplyText("");
      showAction("success", "Reply sent");

      // Refresh comments for this ad
      const ad = adPosts.find((a) => a.id === adId);
      if (ad) fetchComments(adId, ad.post_id);
    } catch (err: any) {
      showAction("error", err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingCommentId || !expandedAdId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/actions/${deletingCommentId}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fbPageId: selectedPageId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete comment");
      }

      const adId = expandedAdId;
      setComments((prev) => ({
        ...prev,
        [adId]: prev[adId]
          .filter((c) => c.id !== deletingCommentId)
          .map((c) => c.replies
            ? { ...c, replies: c.replies.filter((r) => r.id !== deletingCommentId) }
            : c
          ),
      }));

      setDeletingCommentId(null);
      showAction("success", "Comment deleted permanently");
    } catch (err: any) {
      showAction("error", err.message);
      setDeletingCommentId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete hidden comments
  const getHiddenCommentIds = (adId: string): string[] => {
    const adComments = comments[adId] || [];
    const ids: string[] = [];
    for (const c of adComments) {
      if (c.isHidden) ids.push(c.id);
      if (c.replies) {
        for (const r of c.replies) {
          if (r.isHidden) ids.push(r.id);
        }
      }
    }
    return ids;
  };

  const handleBulkDeleteHidden = async (adId: string) => {
    const hiddenIds = getHiddenCommentIds(adId);
    if (hiddenIds.length === 0) return;

    // Cap at 20 per batch (server also enforces this)
    const batch = hiddenIds.slice(0, 20);

    setBulkDeleting(adId);
    setBulkProgress({ deleted: 0, total: batch.length, failed: 0 });

    try {
      const res = await fetch("/api/comments/actions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fbPageId: selectedPageId, commentIds: batch }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Bulk delete failed");
      }

      const result: { deleted: string[]; failed: { id: string; error: string }[] } = await res.json();

      // Remove deleted comments from state
      const deletedSet = new Set(result.deleted);
      setComments((prev) => ({
        ...prev,
        [adId]: prev[adId]
          .filter((c) => !deletedSet.has(c.id))
          .map((c) => c.replies
            ? { ...c, replies: c.replies.filter((r) => !deletedSet.has(r.id)) }
            : c
          ),
      }));

      setBulkProgress({ deleted: result.deleted.length, total: batch.length, failed: result.failed.length });

      if (result.failed.length > 0) {
        showAction("error", `Deleted ${result.deleted.length}/${batch.length} - ${result.failed.length} failed`);
      } else {
        showAction("success", `Deleted ${result.deleted.length} hidden comments`);
      }
    } catch (err: any) {
      showAction("error", err.message);
    } finally {
      setTimeout(() => {
        setBulkDeleting(null);
        setBulkProgress(null);
      }, 2000);
    }
  };

  const showAction = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter comments
  const getFilteredComments = (adId: string) => {
    const adComments = comments[adId] || [];
    if (filter === "all") return adComments;
    if (filter === "visible") return adComments.filter((c) => !c.isHidden);
    return adComments.filter((c) => c.isHidden);
  };

  // Count hidden comments (from loaded)
  const getHiddenCount = (adId: string): number => {
    return getHiddenCommentIds(adId).length;
  };

  // Get unique campaigns for filter
  const campaigns = [...new Set(adPosts.map((a) => a.campaign).filter(Boolean))] as string[];

  // Filter ads by campaign
  const filteredAds = campaignFilter === "all"
    ? adPosts
    : adPosts.filter((a) => a.campaign === campaignFilter);

  // Group ads by hierarchy: Ad Account > Campaign > AdSet
  interface AdGroup {
    key: string;
    adAccount: string;
    campaign: string;
    adset: string;
    ads: AdPost[];
  }

  const groupedAds = (() => {
    const groups: AdGroup[] = [];
    const ungrouped: AdPost[] = [];

    for (const ad of filteredAds) {
      if (!ad.ad_account && !ad.campaign && !ad.adset) {
        ungrouped.push(ad);
        continue;
      }

      const key = `${ad.ad_account || ""}_${ad.campaign || ""}_${ad.adset || ""}`;
      const existing = groups.find((g) => g.key === key);
      if (existing) {
        existing.ads.push(ad);
      } else {
        groups.push({
          key,
          adAccount: ad.ad_account || "",
          campaign: ad.campaign || "",
          adset: ad.adset || "",
          ads: [ad],
        });
      }
    }

    return { groups, ungrouped };
  })();

  // Render a single ad card with its comments
  const renderAdCard = (ad: AdPost, hiddenCount: number) => (
    <div
      key={ad.id}
      className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
    >
      {/* Ad header */}
      <button
        onClick={() => toggleAd(ad)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-750 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              expandedAdId === ad.id ? "bg-blue-500" : "bg-zinc-600"
            }`}
          />
          <div className="min-w-0">
            <span className="text-sm font-medium text-white truncate block">
              {ad.post_name}
            </span>
            <span className="text-xs text-zinc-500 truncate block">
              {ad.post_id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {comments[ad.id] && (
            <span className="text-xs text-zinc-500">
              {comments[ad.id].length} loaded
            </span>
          )}
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform ${
              expandedAdId === ad.id ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded comments */}
      {expandedAdId === ad.id && (
        <div className="border-t border-zinc-700">
          {isLoadingComments === ad.id ? (
            <div className="p-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full mx-auto"></div>
              <p className="text-zinc-400 mt-2 text-xs">Loading comments...</p>
            </div>
          ) : getFilteredComments(ad.id).length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-sm">
              {filter !== "all"
                ? `No ${filter} comments`
                : "No comments on this ad"}
            </div>
          ) : (
            <div className="divide-y divide-zinc-700/50">
              {/* Bulk delete hidden button */}
              {hiddenCount > 0 && (
                <div className="p-3 bg-amber-900/10 border-b border-amber-700/30 flex items-center justify-between gap-3">
                  <div className="text-sm text-amber-400">
                    {bulkDeleting === ad.id && bulkProgress ? (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin w-4 h-4 border-2 border-amber-700 border-t-amber-400 rounded-full"></div>
                        <span>
                          Deleting... {bulkProgress.deleted}/{bulkProgress.total}
                          {bulkProgress.failed > 0 && ` (${bulkProgress.failed} failed)`}
                        </span>
                        <div className="w-32 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${((bulkProgress.deleted + bulkProgress.failed) / bulkProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span>{hiddenCount} hidden comment{hiddenCount !== 1 ? "s" : ""} loaded</span>
                    )}
                  </div>
                  {!bulkDeleting && (
                    <button
                      onClick={() => handleBulkDeleteHidden(ad.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-red-600/80 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Delete hidden ({Math.min(hiddenCount, 20)}{hiddenCount > 20 ? " of " + hiddenCount : ""})
                    </button>
                  )}
                </div>
              )}

              {getFilteredComments(ad.id).map((comment) => {
                const hasNoReplies = !comment.replies || comment.replies.length === 0;

                return (
                  <div
                    key={comment.id}
                    className={`p-4 ${
                      comment.isHidden
                        ? "bg-amber-950/20 border-l-2 border-l-amber-600/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-blue-400">
                            {comment.authorName}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {formatDate(comment.createdTime)}
                          </span>
                          {comment.isHidden && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-900/30 text-amber-400 border border-amber-700/50">
                              Hidden
                            </span>
                          )}
                          {hasNoReplies && !comment.isHidden && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/30 text-blue-400 border border-blue-700/50">
                              Needs reply
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${
                          hasNoReplies && !comment.isHidden
                            ? "text-white font-semibold"
                            : comment.isHidden
                              ? "text-amber-200/70"
                              : "text-zinc-300"
                        }`}>
                          {comment.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setReplyingTo(
                              replyingTo === comment.id ? null : comment.id
                            );
                            setReplyText("");
                          }}
                          className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-zinc-700 rounded transition-colors"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => handleToggleHide(comment, ad.id)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            comment.isHidden
                              ? "text-emerald-400 hover:text-emerald-300 hover:bg-zinc-700"
                              : "text-amber-400 hover:text-amber-300 hover:bg-zinc-700"
                          }`}
                        >
                          {comment.isHidden ? "Unhide" : "Hide"}
                        </button>
                        <button
                          onClick={() => setDeletingCommentId(comment.id)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Reply input */}
                    {replyingTo === comment.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(comment.id, ad.id);
                            }
                          }}
                          placeholder="Write a reply..."
                          className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={() => handleReply(comment.id, ad.id)}
                          disabled={isSendingReply || !replyText.trim()}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          {isSendingReply ? "..." : "Send"}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          className="px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 ml-6 border-l-2 border-zinc-700 pl-4 space-y-3">
                        {comment.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`${reply.isHidden ? "bg-amber-950/20 rounded px-2 py-1 -mx-2" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-blue-400">
                                    {reply.authorName}
                                  </span>
                                  <span className="text-xs text-zinc-600">
                                    {formatDate(reply.createdTime)}
                                  </span>
                                  {reply.isHidden && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-900/30 text-amber-400 border border-amber-700/50">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm ${
                                  reply.isHidden ? "text-amber-200/70" : "text-zinc-400"
                                }`}>
                                  {reply.message}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleToggleHide(reply, ad.id)}
                                  className={`px-2 py-1 text-xs rounded transition-colors ${
                                    reply.isHidden
                                      ? "text-emerald-400 hover:text-emerald-300 hover:bg-zinc-700"
                                      : "text-amber-400 hover:text-amber-300 hover:bg-zinc-700"
                                  }`}
                                >
                                  {reply.isHidden ? "Unhide" : "Hide"}
                                </button>
                                <button
                                  onClick={() => setDeletingCommentId(reply.id)}
                                  className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Show more button */}
              {hasMore[ad.id] && (
                <div className="p-4 text-center">
                  <button
                    onClick={() => loadMoreComments(ad.id, ad.post_id)}
                    disabled={isLoadingMore === ad.id}
                    className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-zinc-700/50 rounded-md transition-colors disabled:opacity-50"
                  >
                    {isLoadingMore === ad.id ? "Loading..." : "Show more comments"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Refresh comments button */}
          <div className="p-3 border-t border-zinc-700/50 text-center">
            <button
              onClick={() => fetchComments(ad.id, ad.post_id)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Refresh comments
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // No pages configured
  if (!isLoadingPages && pages.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Comments Moderation</h1>
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
          <p className="text-zinc-400 text-lg mb-2">No Facebook pages configured</p>
          <p className="text-zinc-500 text-sm mb-6">
            Add a Facebook page in FB Settings to start moderating comments
          </p>
          <Link
            href="/admin/comments/settings"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Go to FB Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Comments Moderation</h1>

        <div className="flex items-center gap-3">
          {/* Page selector */}
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.page_name}
              </option>
            ))}
          </select>

          {/* Campaign filter */}
          {campaigns.length > 0 && (
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Comments</option>
            <option value="visible">Visible Only</option>
            <option value="hidden">Hidden Only</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchAdPosts}
            disabled={isLoadingAds}
            className="px-3 py-2 bg-zinc-700 text-zinc-200 rounded-lg hover:bg-zinc-600 disabled:opacity-50 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div
          className={`rounded-lg p-3 text-sm ${
            actionMessage.type === "success"
              ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
              : "bg-red-900/30 border border-red-700 text-red-300"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {(isLoadingPages || isLoadingAds) && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-blue-500 rounded-full mx-auto"></div>
          <p className="text-zinc-400 mt-4 text-sm">
            {isLoadingPages ? "Loading pages..." : "Loading ads..."}
          </p>
        </div>
      )}

      {/* No ads configured */}
      {!isLoadingAds && adPosts.length === 0 && !error && !isLoadingPages && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
          <p className="text-zinc-400 text-lg mb-2">No ad posts configured</p>
          <p className="text-zinc-500 text-sm mb-6">
            Add ad posts in FB Settings to start moderating their comments
          </p>
          <Link
            href="/admin/comments/settings"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Go to FB Settings
          </Link>
        </div>
      )}

      {/* Ad Posts list */}
      {!isLoadingAds && adPosts.length > 0 && (
        <div className="space-y-4">
          {/* Grouped sections */}
          {groupedAds.groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                {group.adAccount && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">{group.adAccount}</span>
                )}
                {group.campaign && (
                  <>
                    {group.adAccount && <span className="text-zinc-600 text-xs">/</span>}
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">{group.campaign}</span>
                  </>
                )}
                {group.adset && (
                  <>
                    <span className="text-zinc-600 text-xs">/</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800/50">{group.adset}</span>
                  </>
                )}
                <span className="text-xs text-zinc-600">({group.ads.length})</span>
              </div>
              {group.ads.map((ad) => {
                const hiddenCount = comments[ad.id] ? getHiddenCount(ad.id) : 0;
                return renderAdCard(ad, hiddenCount);
              })}
            </div>
          ))}

          {/* Ungrouped */}
          {groupedAds.ungrouped.length > 0 && (
            <div className="space-y-2">
              {groupedAds.groups.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-zinc-500">Ungrouped</span>
                  <span className="text-xs text-zinc-600">({groupedAds.ungrouped.length})</span>
                </div>
              )}
              {groupedAds.ungrouped.map((ad) => {
                const hiddenCount = comments[ad.id] ? getHiddenCount(ad.id) : 0;
                return renderAdCard(ad, hiddenCount);
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingCommentId}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={handleDelete}
        title="Delete Comment"
        message="Are you sure you want to permanently delete this comment? This action cannot be undone."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        isProcessing={isDeleting}
      />
    </div>
  );
}
