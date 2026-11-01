import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeBlocks, normalizePageBackground } from "@/lib/page-blocks";
import { loadFooterLibrary } from "@/lib/page-footers";
import { sanitizeBlocks } from "@/lib/sanitize-rich-text";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";

// Pages served on a customer's own domain: the middleware rewrites comanda.client.ro/<slug> to /sites/comanda~client~ro/<slug>.
// The domain gives the organization; /<slug> is the domain's sales page with that slug, or else one of the organization's
// legal pages. A slug that does not exist (or is not published) goes to the domain's base address when one is set
// (Domains screen), otherwise it is a 404. Cached, refreshed at most once a minute (and right away after a save).
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const HOST_RE = /^[a-z0-9.-]{3,253}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;

// The middleware writes the hostname with "~" in place of dots (a dot would make the path look like a file)
const decodeHost = (encodedHost: string) => encodedHost.replaceAll("~", ".");

async function getDomain(host: string) {
  if (!HOST_RE.test(host)) return null;
  const { data } = await supabaseAdmin
    .from("page_domains")
    .select("id, organization_id, root_redirect, favicon_url")
    .eq("hostname", host)
    .in("status", ["verified", "active"])
    .maybeSingle();
  return data;
}

async function getPage(encodedHost: string, path: string[] | undefined) {
  const host = decodeHost(encodedHost);
  if (!path || path.length !== 1 || !SLUG_RE.test(path[0])) return null;
  const slug = path[0].toLowerCase();

  const domain = await getDomain(host);
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

// 1x1 transparent PNG: a domain without its own icon shows no icon at all, not the application's default one
const NEUTRAL_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { host, path } = await params;
  const [page, domain] = await Promise.all([getPage(host, path), getDomain(decodeHost(host))]);
  const icon = domain?.favicon_url || NEUTRAL_ICON;
  return {
    title: page?.title || "Pagină",
    icons: { icon, apple: domain?.favicon_url || undefined },
    // Test phase: keep own pages out of search results
    robots: { index: false, follow: false },
  };
}

export default async function SitePage({ params }: Params) {
  const { host, path } = await params;
  const page = await getPage(host, path);
  if (!page) {
    // Unknown or unpublished slug: back to the domain's base address (temporary redirect), if one is set
    const domain = await getDomain(decodeHost(host));
    if (domain?.root_redirect) redirect(domain.root_redirect);
    notFound();
  }

  const blocks = sanitizeBlocks(normalizeBlocks(page.blocks));
  const footerLibrary = await loadFooterLibrary(page.organization_id, blocks);
  return <BlockRenderer blocks={blocks} background={normalizePageBackground(page.background)} footerLibrary={footerLibrary} />;
}
