import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeBlocks, normalizePageBackground } from "@/lib/page-blocks";
import { loadFooterLibrary } from "@/lib/page-footers";
import { sanitizeBlocks } from "@/lib/sanitize-rich-text";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";
import PageTracker from "@/components/page-blocks/PageTracker";
import { absoluteUrl, pickShareImage } from "@/lib/share-preview";

// Pages served on a customer's own domain: the middleware rewrites comanda.client.ro/<slug> to /sites/comanda~client~ro/<slug>.
// The domain gives the organization; /<slug> is the domain's sales page with that slug, or else one of the organization's
// legal pages. A slug that does not exist (or is not published) goes to the domain's base address when one is set
// (Domains screen), otherwise it is a 404. The bare address of the domain (no path) shows the page marked as its homepage;
// without one it behaves like an unknown slug. Cached, refreshed at most once a minute (and right away after a save).
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
  const bare = !path || path.length === 0;
  if (!bare && (path.length !== 1 || !SLUG_RE.test(path[0]))) return null;

  const domain = await getDomain(host);
  if (!domain) return null;

  // The homepage of the domain: the published page marked as home
  if (bare) {
    const { data: home } = await supabaseAdmin
      .from("landing_page_content")
      .select("id, title, background, blocks, layout")
      .eq("organization_id", domain.organization_id)
      .eq("domain_id", domain.id)
      .eq("is_home", true)
      .eq("status", "published")
      .maybeSingle();
    return home ? { ...home, organization_id: domain.organization_id as string } : null;
  }
  const slug = path![0].toLowerCase();

  const { data: sales, error } = await supabaseAdmin
    .from("landing_page_content")
    .select("id, title, background, blocks, layout")
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
  return legal ? { ...legal, id: null, layout: "narrow", organization_id: domain.organization_id as string } : null;
}

type Params = { params: Promise<{ host: string; path?: string[] }> };

// 1x1 transparent PNG: a domain without its own icon shows no icon at all, not the application's default one
const NEUTRAL_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Link card settings of a sales page. Read apart from the page so a page still loads before migration 112 is applied.
async function getShareSettings(pageId: string | null) {
  if (!pageId) return null;
  const { data } = await supabaseAdmin.from("landing_page_content").select("share_image_url, share_title, share_description").eq("id", pageId).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { host, path } = await params;
  const [page, domain] = await Promise.all([getPage(host, path), getDomain(decodeHost(host))]);
  const icon = domain?.favicon_url || NEUTRAL_ICON;
  const title = page?.title || "Pagină";

  // Link card (Facebook / WhatsApp): the uploaded image, else the first photo of the page's main blocks
  const share = page ? await getShareSettings(page.id) : null;
  const shareImage = share?.share_image_url || (page ? pickShareImage(normalizeBlocks(page.blocks)) : null);
  const cardTitle = share?.share_title || title;
  const cardDescription = share?.share_description || undefined;
  const image = shareImage ? absoluteUrl(shareImage, decodeHost(host)) : undefined;
  return {
    title,
    icons: { icon, apple: domain?.favicon_url || undefined },
    openGraph: { type: "website", title: cardTitle, description: cardDescription, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: cardTitle, description: cardDescription, ...(image ? { images: [image] } : {}) },
    // Test phase: keep own pages out of search results
    robots: { index: false, follow: false },
  };
}

export default async function SitePage({ params }: Params) {
  const { host, path } = await params;
  const page = await getPage(host, path);
  if (!page) {
    // Unknown or unpublished slug, or a domain without a homepage: to the domain's base address (temporary redirect), if one is set
    const domain = await getDomain(decodeHost(host));
    if (domain?.root_redirect) redirect(domain.root_redirect);
    notFound();
  }

  const blocks = sanitizeBlocks(normalizeBlocks(page.blocks));
  const footerLibrary = await loadFooterLibrary(page.organization_id, blocks);
  return (
    <>
      <BlockRenderer
        blocks={blocks}
        background={normalizePageBackground(page.background)}
        footerLibrary={footerLibrary}
        layout={page.layout === "wide" ? "wide" : "narrow"}
      />
      {/* Visit counter for the statistics screen; legal pages are not counted */}
      {page.id && <PageTracker pageId={page.id} />}
    </>
  );
}
