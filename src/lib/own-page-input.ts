import { normalizeBlocks, normalizePageBackground, type PageBlock } from "@/lib/page-blocks";

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_BLOCKS = 200;
const MAX_JSON_BYTES = 400_000;

/** Blocks coming from the editor: validated, capped and normalized (unknown or malformed blocks are dropped). */
export function parseBlocksInput(raw: unknown): { ok: true; blocks: PageBlock[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "blocks must be an array" };
  if (raw.length > MAX_BLOCKS) return { ok: false, error: `Too many blocks (max ${MAX_BLOCKS})` };
  if (JSON.stringify(raw).length > MAX_JSON_BYTES) return { ok: false, error: "Page content is too large" };
  return { ok: true, blocks: normalizeBlocks(raw) };
}

export const parseBackground = (raw: unknown): string => normalizePageBackground(raw);

export function parseSlug(raw: unknown): string | null {
  const slug = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return SLUG_PATTERN.test(slug) ? slug : null;
}

export const parseTitle = (raw: unknown): string => (typeof raw === "string" ? raw.trim().slice(0, 120) : "");
