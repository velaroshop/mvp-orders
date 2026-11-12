// Link card (Facebook / WhatsApp) of an own page: when no share image was uploaded, one is picked from the page.
// Only the main content blocks are looked at, in page order: the photos inside comments and reviews (profile
// pictures) are never used, which is what the social crawlers do when they pick "the first image" on their own.

import type { PageBlock } from "@/lib/page-blocks";

/** First usable photo of the page: image block, gallery, video poster or product card, in page order. Null when there is none. */
export function pickShareImage(blocks: PageBlock[]): string | null {
  for (const block of blocks) {
    let src: string | null | undefined = null;
    switch (block.type) {
      case "image":
        src = block.src;
        break;
      case "gallery":
        src = block.images[0]?.src;
        break;
      case "video":
        src = block.poster;
        break;
      case "products":
        src = block.items.find((item) => item.image)?.image;
        break;
    }
    if (src) return src;
  }
  return null;
}

/** Link cards need an absolute address: a relative one is made absolute on the page's own host */
export function absoluteUrl(src: string, host: string): string {
  return /^https?:\/\//i.test(src) ? src : `https://${host}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Facebook Sharing Debugger for a page address: where the cached link card is refreshed after a change */
export const sharingDebuggerUrl = (pageUrl: string) => `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(pageUrl)}`;
