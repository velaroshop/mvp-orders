// Pure helpers for footer libraries (safe for client and server code; the database loader is in page-footers.ts)
import { normalizeBlocks, type FooterBlock } from "@/lib/page-blocks";

export type FooterLibrary = { byId: Record<string, FooterBlock>; fallback: FooterBlock | null };

export const EMPTY_FOOTER_LIBRARY: FooterLibrary = { byId: {}, fallback: null };

/** The stored footer content as a validated footer block (or null when it is not usable) */
export function parseFooterBlock(raw: unknown): FooterBlock | null {
  const base = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const block = normalizeBlocks([{ ...base, type: "footer" }])[0];
  return block && block.type === "footer" ? block : null;
}

export function resolveFooter(footerId: string | null, library: FooterLibrary): FooterBlock | null {
  return (footerId ? library.byId[footerId] : undefined) ?? library.fallback;
}

/** Library from the rows of the list API: [{ id, block, is_default }] */
export function buildFooterLibrary(rows: { id: string; block: unknown; is_default: boolean }[]): FooterLibrary {
  const library: FooterLibrary = { byId: {}, fallback: null };
  for (const row of rows) {
    const footer = parseFooterBlock(row.block);
    if (!footer) continue;
    library.byId[row.id] = footer;
    if (row.is_default) library.fallback = footer;
  }
  return library;
}
