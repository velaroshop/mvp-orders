import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Domenii de dezvoltare permise întotdeauna
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXTAUTH_URL,
].filter(Boolean) as string[];

/**
 * Verifică dacă un origin corespunde unui domeniu din store
 * storeUrl poate fi stocat fără protocol (ex: "velaro-shop.ro")
 */
function isOriginMatchingStoreUrl(origin: string, storeUrl: string): boolean {
  if (!origin || !storeUrl) return false;

  // Extrage hostname-ul din origin (ex: "https://velaro-shop.ro" -> "velaro-shop.ro")
  let originHost: string;
  try {
    originHost = new URL(origin).hostname;
  } catch {
    return false;
  }

  // Normalizează storeUrl (elimină protocol dacă există)
  const normalizedStoreUrl = storeUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase();

  // Verifică match exact sau cu www
  const originHostLower = originHost.toLowerCase();
  return (
    originHostLower === normalizedStoreUrl ||
    originHostLower === `www.${normalizedStoreUrl}` ||
    `www.${originHostLower}` === normalizedStoreUrl
  );
}

/**
 * Obține header-ele CORS pentru un request
 * În OPTIONS nu avem orderId, deci permitem doar dev origins
 * În GET verificăm și domeniul store-ului
 */
function getBaseCorsHeaders(origin: string | null, allowedOrigin: string) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isDevOrigin(origin: string | null): boolean {
  return origin !== null && DEV_ORIGINS.includes(origin);
}

const DEFAULT_CTA_MESSAGE =
  "Comanda ta este înregistrată. Un coleg te sună în curând pentru confirmare.\nDacă vrei, vezi și alte produse pe care le vindem. Plătești tot la livrare.";
const DEFAULT_CTA_BUTTON_TEXT = "Vezi toate produsele";
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Adds https:// when missing, accepts only http(s) and tags the link with utm params */
function buildCtaUrl(raw: string | null | undefined): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.searchParams.set("utm_source", "thank-you");
    url.searchParams.set("utm_medium", "postpurchase");
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Optional "see all products" block for the final thank-you state.
 * Fault-tolerant on purpose: if anything fails (e.g. columns not migrated yet) the page just has no CTA.
 */
async function getThankYouCta(landingPageId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("landing_pages")
      .select(`
        show_thank_you_cta,
        stores(
          url,
          primary_color,
          thank_you_cta_message,
          thank_you_cta_button_text,
          thank_you_cta_button_color,
          thank_you_cta_button_text_color,
          thank_you_cta_url
        )
      `)
      .eq("id", landingPageId)
      .single();

    if (error || !data || !(data as any).show_thank_you_cta) return null;

    const store = (data as any).stores;
    if (!store) return null;

    const url = buildCtaUrl(store.thank_you_cta_url || store.url);
    if (!url) return null;

    const pickColor = (value: string | null | undefined, fallback: string) =>
      value && HEX_COLOR.test(value.trim()) ? value.trim() : fallback;

    return {
      message: (store.thank_you_cta_message || "").trim() || DEFAULT_CTA_MESSAGE,
      buttonText: (store.thank_you_cta_button_text || "").trim() || DEFAULT_CTA_BUTTON_TEXT,
      buttonColor: pickColor(store.thank_you_cta_button_color, pickColor(store.primary_color, "#22c55e")),
      buttonTextColor: pickColor(store.thank_you_cta_button_text_color, "#ffffff"),
      url,
    };
  } catch (err) {
    console.error("[Thank You Verify] CTA lookup failed:", err);
    return null;
  }
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin');

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order");
    const previewLandingPageId = searchParams.get("preview");

    // Preview mode: return mock data with real upsell config (admin only)
    if (previewLandingPageId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: landingPage } = await supabaseAdmin
        .from("landing_pages")
        .select(`id, slug, post_purchase_status, stores(url, primary_color, accent_color, text_on_dark_color)`)
        .eq("id", previewLandingPageId)
        .single();

      if (!landingPage) {
        return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
      }

      const store = (landingPage as any).stores;

      const { data: postsaleUpsells } = await supabaseAdmin
        .from("upsells")
        .select(`id, title, description, quantity, srp, price, media_url, display_order, products!inner(id, name, sku, status)`)
        .eq("landing_page_id", landingPage.id)
        .eq("type", "postsale")
        .eq("active", true)
        .eq("products.status", "active")
        .order("display_order", { ascending: true });

      const hasPostsale = postsaleUpsells && postsaleUpsells.length > 0;

      const formattedUpsells = (postsaleUpsells || []).map((u: any) => ({
        id: u.id,
        title: u.title,
        description: u.description,
        quantity: u.quantity,
        srp: u.srp,
        price: u.price,
        mediaUrl: u.media_url,
        productId: u.products.id,
        productName: u.products.name,
        productSku: u.products.sku,
      }));

      return NextResponse.json({
        orderId: "preview",
        status: "queue",
        customerName: "Client Preview",
        queueExpiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        showPostsale: hasPostsale,
        postsaleUpsells: hasPostsale ? formattedUpsells : undefined,
        storeColors: hasPostsale ? {
          primary: store?.primary_color,
          accent: store?.accent_color,
          textOnDark: store?.text_on_dark_color,
        } : undefined,
        isPreview: true,
      });
    }

    console.log("[Thank You Verify] Request for orderId:", orderId, "from origin:", origin);

    if (!orderId) {
      // Pentru erori fără orderId, permitem same-origin și dev origins
      const headers = origin ? getBaseCorsHeaders(origin, isDevOrigin(origin) ? origin : DEV_ORIGINS[0]) : {};
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400, headers }
      );
    }

    // Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, landing_key, organization_id, full_name, queue_expires_at, upsells, product_name, product_quantity, subtotal, shipping_cost, total")
      .eq("id", orderId)
      .single();

    console.log("[Thank You Verify] Order fetch result:", { order, orderError });

    if (orderError || !order) {
      console.error("[Thank You Verify] Error fetching order:", orderError);
      const headers = origin ? getBaseCorsHeaders(origin, isDevOrigin(origin) ? origin : DEV_ORIGINS[0]) : {};
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404, headers }
      );
    }

    console.log("[Thank You Verify] Fetching landing page with slug:", order.landing_key);

    // Fetch landing page and store details (inclusiv url pentru CORS)
    let lpQuery = supabaseAdmin
      .from("landing_pages")
      .select(`
        id,
        slug,
        post_purchase_status,
        stores(
          url,
          primary_color,
          accent_color,
          text_on_dark_color
        )
      `)
      .eq("slug", order.landing_key);

    if (order.organization_id) {
      lpQuery = lpQuery.eq("organization_id", order.organization_id);
    }

    const { data: landingPage, error: landingError } = await lpQuery.single();

    console.log("[Thank You Verify] Landing page fetch result:", { landingPage, landingError });

    if (landingError || !landingPage) {
      console.error("[Thank You Verify] Error fetching landing page:", landingError);
      const headers = origin ? getBaseCorsHeaders(origin, isDevOrigin(origin) ? origin : DEV_ORIGINS[0]) : {};
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404, headers }
      );
    }

    const store = (landingPage as any).stores;

    // Verificare CORS:
    // - origin null = same-origin request sau direct navigation (permis)
    // - origin dev = development (permis)
    // - origin == store.url = producție validă (permis)
    const storeUrl = store?.url || null;
    const isAllowedOrigin =
      origin === null || // Same-origin sau direct navigation
      isDevOrigin(origin) ||
      (storeUrl && isOriginMatchingStoreUrl(origin, storeUrl));

    if (!isAllowedOrigin) {
      console.warn(`[Thank You Verify] CORS blocked: origin=${origin}, storeUrl=${storeUrl}`);
      return NextResponse.json(
        { error: "Origin not allowed" },
        { status: 403, headers: getBaseCorsHeaders(origin, DEV_ORIGINS[0]) }
      );
    }

    // Pentru same-origin requests, nu avem nevoie de CORS headers
    const headers = origin ? getBaseCorsHeaders(origin, origin) : {};

    // Check organization plan - basic plan has no postsale upsells
    const { data: orgData } = await supabaseAdmin
      .from("landing_pages")
      .select("organizations(plan)")
      .eq("slug", order.landing_key)
      .single();
    const orgPlan = (orgData as any)?.organizations?.plan || "pro";

    const thankYouCta = await getThankYouCta((landingPage as any).id);

    // Build order details for confirmation display
    const acceptedUpsells = (order.upsells || []).map((u: any) => ({
      name: u.productName || u.title,
      quantity: u.quantity,
      price: u.price,
    }));
    const orderDetails = {
      productName: order.product_name,
      productQuantity: order.product_quantity,
      upsells: acceptedUpsells,
      subtotal: order.subtotal,
      shippingCost: order.shipping_cost,
      total: order.total,
    };

    // If order is not in queue, postsale is not enabled, or plan is basic, return simple confirmation
    if (order.status !== "queue" || !(landingPage as any).post_purchase_status || orgPlan === "basic") {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        customerName: order.full_name,
        showPostsale: false,
        orderDetails,
        thankYouCta,
      }, { headers });
    }

    // Fetch available postsale upsells for this landing page
    const { data: postsaleUpsells, error: upsellsError } = await supabaseAdmin
      .from("upsells")
      .select(`
        id,
        title,
        description,
        quantity,
        srp,
        price,
        media_url,
        display_order,
        products!inner(
          id,
          name,
          sku,
          status
        )
      `)
      .eq("landing_page_id", (landingPage as any).id)
      .eq("type", "postsale")
      .eq("active", true)
      .eq("products.status", "active")
      .order("display_order", { ascending: true });

    if (upsellsError) {
      console.error("Error fetching postsale upsells:", upsellsError);
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        customerName: order.full_name,
        showPostsale: false,
        orderDetails,
        thankYouCta,
      }, { headers });
    }

    // If no valid postsale upsells, return simple confirmation
    if (!postsaleUpsells || postsaleUpsells.length === 0) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        customerName: order.full_name,
        showPostsale: false,
        orderDetails,
        thankYouCta,
      }, { headers });
    }

    // Format upsells for response
    const formattedUpsells = postsaleUpsells.map((upsell: any) => ({
      id: upsell.id,
      title: upsell.title,
      description: upsell.description,
      quantity: upsell.quantity,
      srp: upsell.srp,
      price: upsell.price,
      mediaUrl: upsell.media_url,
      productId: upsell.products.id,
      productName: upsell.products.name,
      productSku: upsell.products.sku,
    }));

    // Return order data with postsale info
    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      customerName: order.full_name,
      queueExpiresAt: order.queue_expires_at,
      showPostsale: true,
      postsaleUpsells: formattedUpsells,
      orderDetails,
      thankYouCta,
      storeColors: {
        primary: store.primary_color,
        accent: store.accent_color,
        textOnDark: store.text_on_dark_color,
      },
    }, { headers });
  } catch (error) {
    console.error("Error verifying order for thank you page:", error);
    const origin = request.headers.get('origin');
    const headers = origin ? getBaseCorsHeaders(origin, isDevOrigin(origin) ? origin : DEV_ORIGINS[0]) : {};
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}

// Handle OPTIONS request for CORS preflight
// Pentru OPTIONS nu avem orderId, deci permitem doar dev origins
// Browser-ul va face apoi GET cu orderId unde se face validarea completă
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');

  // Pentru preflight, permitem dev origins și orice domeniu .ro (store-urile noastre)
  // Validarea reală se face în GET când avem orderId
  const isLikelyStoreOrigin = origin && (
    isDevOrigin(origin) ||
    origin.endsWith('.ro') ||
    origin.includes('.ro:')
  );

  const allowedOrigin = isLikelyStoreOrigin ? origin! : DEV_ORIGINS[0];

  return new NextResponse(null, {
    status: 204,
    headers: getBaseCorsHeaders(origin, allowedOrigin),
  });
}
