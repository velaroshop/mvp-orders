import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeBlocks, normalizePageBackground } from "@/lib/page-blocks";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";
import { DEMO_PAGE } from "@/lib/page-blocks-demo";

// Served from cache and refreshed at most once a minute
export const revalidate = 60;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;

async function getPage(slug: string) {
  // Local-only fixture to check rendering without a database
  if (slug === "_demo" && process.env.NODE_ENV !== "production") return DEMO_PAGE;

  if (!SLUG_RE.test(slug)) return null;

  const { data, error } = await supabaseAdmin
    .from("landing_page_content")
    .select("title, background, blocks")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[Own Page] Failed to load page:", slug, error.message);
    return null;
  }
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  return {
    title: page?.title || "Pagină",
    // Test phase: keep own pages out of search results
    robots: { index: false, follow: false },
  };
}

export default async function OwnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return <BlockRenderer blocks={normalizeBlocks(page.blocks)} background={normalizePageBackground(page.background)} />;
}
