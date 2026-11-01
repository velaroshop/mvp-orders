import { parseFooterBlock } from "@/lib/footer-library";
import type { FooterBlock } from "@/lib/page-blocks";

export const parseFooterName = (raw: unknown): string => (typeof raw === "string" ? raw.trim().slice(0, 60) : "");

/** Footer content coming from the editor: validated and normalized, or null when unusable */
export function parseFooterContent(raw: unknown): FooterBlock | null {
  if (!raw || typeof raw !== "object" || JSON.stringify(raw).length > 100_000) return null;
  return parseFooterBlock(raw);
}
