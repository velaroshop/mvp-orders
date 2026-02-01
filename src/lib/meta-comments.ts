const META_GRAPH_API = "https://graph.facebook.com/v21.0";

interface MetaComment {
  id: string;
  message: string;
  from?: { name: string; id: string };
  created_time: string;
  is_hidden: boolean;
}

interface MetaPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
}

interface MetaPaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

export interface PagePost {
  id: string;
  message: string;
  createdTime: string;
  fullPicture?: string;
  commentsCount: number;
}

export interface PostComment {
  id: string;
  message: string;
  authorName: string;
  authorId: string;
  createdTime: string;
  isHidden: boolean;
}

/**
 * Fetch posts from a Facebook page (includes ad posts)
 */
export async function getPagePosts(
  pageId: string,
  accessToken: string,
  limit = 25
): Promise<PagePost[]> {
  const url = `${META_GRAPH_API}/${pageId}/posts?fields=id,message,created_time,full_picture&limit=${limit}&access_token=${accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch page posts");
  }

  const data: MetaPaginatedResponse<MetaPost> = await response.json();

  // Fetch comment counts in parallel
  const posts = await Promise.all(
    data.data.map(async (post) => {
      const countUrl = `${META_GRAPH_API}/${post.id}/comments?summary=true&limit=0&access_token=${accessToken}`;
      let commentsCount = 0;
      try {
        const countRes = await fetch(countUrl);
        if (countRes.ok) {
          const countData = await countRes.json();
          commentsCount = countData.summary?.total_count || 0;
        }
      } catch {
        // Ignore count errors
      }

      return {
        id: post.id,
        message: post.message || "(No text)",
        createdTime: post.created_time,
        fullPicture: post.full_picture,
        commentsCount,
      };
    })
  );

  return posts;
}

/**
 * Fetch published posts that have ads (promoted posts)
 */
export async function getPageAdPosts(
  pageId: string,
  accessToken: string,
  limit = 25
): Promise<PagePost[]> {
  const url = `${META_GRAPH_API}/${pageId}/ads_posts?fields=id,message,created_time,full_picture&limit=${limit}&access_token=${accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    // ads_posts might not be available, fallback to regular posts
    return getPagePosts(pageId, accessToken, limit);
  }

  const data: MetaPaginatedResponse<MetaPost> = await response.json();

  const posts = await Promise.all(
    data.data.map(async (post) => {
      const countUrl = `${META_GRAPH_API}/${post.id}/comments?summary=true&limit=0&access_token=${accessToken}`;
      let commentsCount = 0;
      try {
        const countRes = await fetch(countUrl);
        if (countRes.ok) {
          const countData = await countRes.json();
          commentsCount = countData.summary?.total_count || 0;
        }
      } catch {
        // Ignore count errors
      }

      return {
        id: post.id,
        message: post.message || "(No text)",
        createdTime: post.created_time,
        fullPicture: post.full_picture,
        commentsCount,
      };
    })
  );

  return posts;
}

/**
 * Fetch comments for a specific post
 */
export async function getPostComments(
  postId: string,
  accessToken: string,
  limit = 100,
  filter: "stream" | "toplevel" = "toplevel"
): Promise<PostComment[]> {
  const url = `${META_GRAPH_API}/${postId}/comments?fields=id,message,from,created_time,is_hidden&limit=${limit}&filter=${filter}&access_token=${accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch comments");
  }

  const data: MetaPaginatedResponse<MetaComment> = await response.json();

  return data.data.map((comment) => ({
    id: comment.id,
    message: comment.message,
    authorName: comment.from?.name || "Unknown",
    authorId: comment.from?.id || "",
    createdTime: comment.created_time,
    isHidden: comment.is_hidden,
  }));
}

/**
 * Reply to a comment
 */
export async function replyToComment(
  commentId: string,
  accessToken: string,
  message: string
): Promise<{ id: string }> {
  const url = `${META_GRAPH_API}/${commentId}/comments`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to reply to comment");
  }

  return response.json();
}

/**
 * Hide a comment
 */
export async function hideComment(
  commentId: string,
  accessToken: string
): Promise<boolean> {
  const url = `${META_GRAPH_API}/${commentId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_hidden: true, access_token: accessToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to hide comment");
  }

  const data = await response.json();
  return data.success;
}

/**
 * Unhide a comment
 */
export async function unhideComment(
  commentId: string,
  accessToken: string
): Promise<boolean> {
  const url = `${META_GRAPH_API}/${commentId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_hidden: false, access_token: accessToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to unhide comment");
  }

  const data = await response.json();
  return data.success;
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string,
  accessToken: string
): Promise<boolean> {
  const url = `${META_GRAPH_API}/${commentId}?access_token=${accessToken}`;

  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to delete comment");
  }

  const data = await response.json();
  return data.success;
}
