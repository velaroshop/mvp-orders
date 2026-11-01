import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";
import { DEMO_PAGE } from "@/lib/page-blocks-demo";
import { normalizeBlocks, normalizePageBackground } from "@/lib/page-blocks";

// Own pages are served only on a customer's verified domain (see src/app/sites). This address on the application
// domain no longer serves any page: it answers 404. Only the local development fixture "_demo" remains, used to check
// how blocks render without a database.

export async function generateStaticParams() {
  return [];
}

const isDemo = (slug: string) => slug === "_demo" && process.env.NODE_ENV !== "production";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: isDemo(slug) ? DEMO_PAGE.title : "Pagină", robots: { index: false, follow: false } };
}

export default async function OwnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isDemo(slug)) notFound();

  return <BlockRenderer blocks={normalizeBlocks(DEMO_PAGE.blocks)} background={normalizePageBackground(DEMO_PAGE.background)} />;
}
