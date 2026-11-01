// Server only. Rich text blocks hold HTML written in the editor (or pasted from another page): it is cleaned with a
// strict allowlist on save and again before rendering, so scripts, iframes, styles and event handlers never reach a public page.
import sanitizeHtml from "sanitize-html";
import type { PageBlock } from "@/lib/page-blocks";

export const RICH_TEXT_MAX_CHARS = 200_000;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "h4", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "a"],
  allowedAttributes: { a: ["href", "title", "rel"] },
  // Disallowed elements are dropped but their text stays (a pasted <div class="x">text</div> becomes plain text)
  disallowedTagsMode: "discard",
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer" } }),
  },
  // Empty paragraphs and headings are dropped
  exclusiveFilter: (frame) => ["p", "li", "h1", "h2", "h3", "h4"].includes(frame.tag) && !frame.text.trim() && frame.mediaChildren.length === 0,
};

export function sanitizeRichText(html: unknown): string {
  if (typeof html !== "string") return "";
  return sanitizeHtml(html.slice(0, RICH_TEXT_MAX_CHARS * 2), OPTIONS).slice(0, RICH_TEXT_MAX_CHARS);
}

/** The same blocks with every rich text block cleaned (used on save and before rendering a public page) */
export function sanitizeBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.map((b) => (b.type === "rich_text" ? { ...b, html: sanitizeRichText(b.html) } : b));
}
