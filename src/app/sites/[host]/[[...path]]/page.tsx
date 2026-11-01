import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeBlocks, normalizePageBackground } from "@/lib/page-blocks";
import { loadFooterLibrary } from "@/lib/page-footers";
import { sanitizeBlocks } from "@/lib/sanitize-rich-text";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";

// Pages served on a customer's own domain: the middleware rewrites comanda.client.ro/<slug> to /sites/comanda~client~ro/<slug>.
// The domain gives the organization; /<slug> is the domain's sales page with that slug, or else one of the organization's
// legal pages. Cached, refreshed at most once a minute (and right away after a save).
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const HOST_RE = /^[a-z0-9.-]{3,253}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;

async function getPage(encodedHost: string, path: string[] | undefined) {
  // The middleware writes the hostname with "~" in place of dots (a dot would make the path look like a file)
  const host = encodedHost.replaceAll("~", ".");
  if (!HOST_RE.test(host) || !path || path.length !== 1 || !SLUG_RE.test(path[0])) return null;
  const slug = path[0].toLowerCase();

  const { data: domain } = await supabaseAdmin
    .from("page_domains")
    .select("id, organization_id")
    .eq("hostname", host)
    .in("status", ["verified", "active"])
    .maybeSingle();
  if (!domain) return null;

  const { data: sales, error } = await supabaseAdmin
    .from("landing_page_content")
    .select("title, background, blocks")
    .eq("organization_id", domain.organization_id)
    .eq("domain_id", domain.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) console.error("[Site Page] sales page lookup failed:", host, slug, error.message);
  if (sales) return { ...sales, organization_id: domain.organization_id as string };

  const { data: legal } = await supabaseAdmin
    .from("legal_pages")
    .select("title, background, blocks")
    .eq("organization_id", domain.organization_id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return legal ? { ...legal, organization_id: domain.organization_id as string } : null;
}

type Params = { params: Promise<{ host: string; path?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { host, path } = await params;
  const page = await getPage(host, path);
  // Test phase: keep own pages out of search results
  return { title: page?.title || "Pagină", robots: { index: false, follow: false } };
}

export default async function SitePage({ params }: Params) {
  const { host, path } = await params;
  const page = await getPage(host, path);
  if (!page) notFound();

  const blocks = sanitizeBlocks(normalizeBlocks(page.blocks));
  const footerLibrary = await loadFooterLibrary(page.organization_id, blocks);
  return <BlockRenderer blocks={blocks} background={normalizePageBackground(page.background)} footerLibrary={footerLibrary} />;
}
