// Footer library of an organization (table page_footers): a page's "shared_footer" block points to one of them,
// or to the organization's default. Always read by organization, so a footer id from another organization
// never resolves (the page falls back to its own organization's default).
import { supabaseAdmin } from "@/lib/supabase";
import type { PageBlock } from "@/lib/page-blocks";
import { buildFooterLibrary, EMPTY_FOOTER_LIBRARY, type FooterLibrary } from "@/lib/footer-library";

/** Footers of one organization, for rendering. Skips the query when the page has no shared footer block. */
export async function loadFooterLibrary(organizationId: string | null | undefined, blocks: PageBlock[]): Promise<FooterLibrary> {
  if (!organizationId || !blocks.some((b) => b.type === "shared_footer")) return EMPTY_FOOTER_LIBRARY;

  const { data, error } = await supabaseAdmin
    .from("page_footers")
    .select("id, block, is_default")
    .eq("organization_id", organizationId);
  if (error) {
    console.error("[Page Footers] load failed:", error.message);
    return EMPTY_FOOTER_LIBRARY;
  }
  return buildFooterLibrary(data ?? []);
}
