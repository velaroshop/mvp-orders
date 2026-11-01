import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeBlocks, normalizePageBackground } from "@/lib/page-blocks";
import { DEFAULT_THANK_YOU } from "@/lib/thank-you-default";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";
import { loadFooterLibrary } from "@/lib/page-footers";
import { sanitizeBlocks } from "@/lib/sanitize-rich-text";
import ThankYouProvider from "@/components/thank-you/ThankYouProvider";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Local-only order id to check rendering without a database
const DEV_ORDER_ID = "00000000-0000-4000-8000-000000000000";

// On a customer's domain the tab icon is the one set for that domain (Domains screen); elsewhere the default one stays
export async function generateMetadata(): Promise<Metadata> {
  const base: Metadata = { title: "Comanda ta", robots: { index: false, follow: false } };
  try {
    const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
    if (!host) return base;
    const { data } = await supabaseAdmin.from("page_domains").select("favicon_url").eq("hostname", host).in("status", ["verified", "active"]).maybeSingle();
    return data?.favicon_url ? { ...base, icons: { icon: data.favicon_url, apple: data.favicon_url } } : base;
  } catch {
    return base;
  }
}

async function getThankYouPage(orderId: string) {
  if (orderId === DEV_ORDER_ID && process.env.NODE_ENV !== "production") return { ...DEFAULT_THANK_YOU, organization_id: null };

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("organization_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order?.organization_id) return null;

  const { data: page } = await supabaseAdmin
    .from("thank_you_page")
    .select("background, blocks")
    .eq("organization_id", order.organization_id)
    .maybeSingle();

  // Table missing or no saved page for this organization: built-in default
  return { ...(page ?? DEFAULT_THANK_YOU), organization_id: order.organization_id as string | null };
}

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  if (!order || !UUID_RE.test(order)) notFound();

  const page = await getThankYouPage(order);
  if (!page) notFound();

  const blocks = sanitizeBlocks(normalizeBlocks(page.blocks));
  const footerLibrary = await loadFooterLibrary(page.organization_id, blocks);

  return (
    <ThankYouProvider orderId={order}>
      <BlockRenderer blocks={blocks} background={normalizePageBackground(page.background)} footerLibrary={footerLibrary} />
    </ThankYouProvider>
  );
}
