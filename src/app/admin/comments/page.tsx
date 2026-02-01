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

interface Post {
  id: string;
  message: string;
  createdTime: string;
  fullPicture?: string;
  commentsCount: number;
}

interface Comment {
  id: string;
  message: string;
  authorName: string;
  authorId: string;
  createdTime: string;
  isHidden: boolean;
}

type FilterType = "all" | "visible" | "hidden";

export default function CommentsPage() {
  // Pages
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [isLoadingPages, setIsLoadingPages] = useState(true);

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  // Comments
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isLoadingComments, setIsLoadingComments] = useState<string | null>(null);
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

  // Fetch posts when page changes
  const fetchPosts = useCallback(async () => {
    if (!selectedPageId) return;

    setIsLoadingPosts(true);
    setError(null);
    setPosts([]);
    setExpandedPostId(null);
    setComments({});

    try {
      const res = await fetch(`/api/comments/${selectedPageId}/posts`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch posts");
      }
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [selectedPageId]);

  useEffect(() => {
    if (selectedPageId) {
      fetchPosts();
    }
  }, [selectedPageId, fetchPosts]);

  // Fetch comments for a post
  const fetchComments = async (postId: string) => {
    if (!selectedPageId) return;

    setIsLoadingComments(postId);
    try {
      const res = await fetch(`/api/comments/${selectedPageId}/posts/${postId}/comments`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch comments");
      }
      const data = await res.json();
      setComments((prev) => ({ ...prev, [postId]: data.comments || [] }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingComments(null);
    }
  };

  const togglePost = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      if (!comments[postId]) {
        fetchComments(postId);
      }
    }
  };

  // Hide/Unhide
  const handleToggleHide = async (comment: Comment, postId: string) => {
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

      // Update local state
      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].map((c) =>
          c.id === comment.id ? { ...c, isHidden: !c.isHidden } : c
        ),
      }));

      showAction("success", comment.isHidden ? "Comment unhidden" : "Comment hidden");
    } catch (err: any) {
      showAction("error", err.message);
    }
  };

  // Reply
  const handleReply = async (commentId: string, postId: string) => {
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

      // Refresh comments
      fetchComments(postId);
    } catch (err: any) {
      showAction("error", err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingCommentId || !expandedPostId) return;

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

      // Remove from local state
      const postId = expandedPostId;
      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].filter((c) => c.id !== deletingCommentId),
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
  const getFilteredComments = (postId: string) => {
    const postComments = comments[postId] || [];
    if (filter === "all") return postComments;
    if (filter === "visible") return postComments.filter((c) => !c.isHidden);
    return postComments.filter((c) => c.isHidden);
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
            onClick={fetchPosts}
            disabled={isLoadingPosts}
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
      {(isLoadingPages || isLoadingPosts) && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-blue-500 rounded-full mx-auto"></div>
          <p className="text-zinc-400 mt-4 text-sm">
            {isLoadingPages ? "Loading pages..." : "Loading posts..."}
          </p>
        </div>
      )}

      {/* Posts list */}
      {!isLoadingPosts && posts.length === 0 && !error && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
          <p className="text-zinc-400">No posts found for this page</p>
        </div>
      )}

      {!isLoadingPosts && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
            >
              {/* Post header - clickable */}
              <button
                onClick={() => togglePost(post.id)}
                className="w-full text-left p-4 hover:bg-zinc-750 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white line-clamp-2">
                      {post.message}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(post.createdTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                      {post.commentsCount} comments
                    </span>
                    <span className="text-zinc-500 text-sm">
                      {expandedPostId === post.id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded comments */}
              {expandedPostId === post.id && (
                <div className="border-t border-zinc-700">
                  {isLoadingComments === post.id ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full mx-auto"></div>
                      <p className="text-zinc-400 mt-2 text-xs">Loading comments...</p>
                    </div>
                  ) : getFilteredComments(post.id).length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-sm">
                      {filter !== "all"
                        ? `No ${filter} comments`
                        : "No comments on this post"}
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-700/50">
                      {getFilteredComments(post.id).map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-4 ${
                            comment.isHidden ? "bg-zinc-900/50" : ""
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
                                title="Reply"
                              >
                                Reply
                              </button>
                              <button
                                onClick={() => handleToggleHide(comment, post.id)}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  comment.isHidden
                                    ? "text-emerald-400 hover:text-emerald-300 hover:bg-zinc-700"
                                    : "text-amber-400 hover:text-amber-300 hover:bg-zinc-700"
                                }`}
                                title={comment.isHidden ? "Unhide" : "Hide"}
                              >
                                {comment.isHidden ? "Unhide" : "Hide"}
                              </button>
                              <button
                                onClick={() => setDeletingCommentId(comment.id)}
                                className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded transition-colors"
                                title="Delete"
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
                                    handleReply(comment.id, post.id);
                                  }
                                }}
                                placeholder="Write a reply..."
                                className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                              <button
                                onClick={() => handleReply(comment.id, post.id)}
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
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Refresh comments button */}
                  <div className="p-3 border-t border-zinc-700/50 text-center">
                    <button
                      onClick={() => fetchComments(post.id)}
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
