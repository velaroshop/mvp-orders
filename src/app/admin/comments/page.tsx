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

  // Reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Delete
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        `/api/comments/${selectedPageId}/posts/${encodeURIComponent(fbPostId)}/comments?limit=25`
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
        `/api/comments/${selectedPageId}/posts/${encodeURIComponent(fbPostId)}/comments?limit=25&after=${cursors[adPostId]}`
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
        <div className="space-y-3">
          {adPosts.map((ad) => (
            <div
              key={ad.id}
              className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
            >
              {/* Ad header - clickable */}
              <button
                onClick={() => toggleAd(ad)}
                className="w-full text-left p-4 hover:bg-zinc-750 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm">
                      {expandedAdId === ad.id ? "▼" : "▶"}
                    </span>
                    <div>
                      <p className="text-sm text-white font-medium">
                        {ad.post_name}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono">
                        {ad.post_id}
                      </p>
                    </div>
                  </div>
                  {comments[ad.id] && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                      {comments[ad.id].length} comments
                    </span>
                  )}
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
                      {getFilteredComments(ad.id).map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-4 ${comment.isHidden ? "bg-zinc-900/50" : ""}`}
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
                              </div>
                              <p className="text-sm text-zinc-300">
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
                                  className={`${reply.isHidden ? "opacity-50" : ""}`}
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
                                      <p className="text-sm text-zinc-400">
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
                      ))}

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
          ))}
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
