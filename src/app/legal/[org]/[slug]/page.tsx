import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeBlocks, normalizePageBackground } from "@/lib/page-blocks";
import { loadFooterLibrary } from "@/lib/page-footers";
import { sanitizeBlocks } from "@/lib/sanitize-rich-text";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";

// Legal pages of an organization (library, see migration 093). On a custom domain they will be served at /<slug>;
// this route works on the app domain, where the organization has to be named. Cached, refreshed at most once a minute.
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;

async function getPage(orgSlug: string, slug: string) {
  if (!SLUG_RE.test(orgSlug) || !SLUG_RE.test(slug)) return null;

  const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) return null;

  const { data, error } = await supabaseAdmin
    .from("legal_pages")
    .select("title, background, blocks")
    .eq("organization_id", org.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    console.error("[Legal Page] Failed to load page:", slug, error.message);
    return null;
  }
  return data ? { ...data, organization_id: org.id as string } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ org: string; slug: string }> }): Promise<Metadata> {
  const { org, slug } = await params;
  const page = await getPage(org, slug);
  return { title: page?.title || "Pagină", robots: { index: false, follow: false } };
}

export default async function LegalPage({ params }: { params: Promise<{ org: string; slug: string }> }) {
  const { org, slug } = await params;
  const page = await getPage(org, slug);
  if (!page) notFound();

  const blocks = sanitizeBlocks(normalizeBlocks(page.blocks));
  const footerLibrary = await loadFooterLibrary(page.organization_id, blocks);
  return <BlockRenderer blocks={blocks} background={normalizePageBackground(page.background)} footerLibrary={footerLibrary} />;
}
