import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Domenii de dezvoltare permise întotdeauna
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://mvp-orders.vercel.app',
];

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

export async function GET(request: Request) {
  const origin = request.headers.get('origin');

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order");

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
      .select("id, status, landing_key, full_name, queue_expires_at, upsells")
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
    const { data: landingPage, error: landingError } = await supabaseAdmin
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
      .eq("slug", order.landing_key)
      .single();

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

    // If order is not in queue or postsale is not enabled, return simple confirmation
    if (order.status !== "queue" || !(landingPage as any).post_purchase_status) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        customerName: order.full_name,
        showPostsale: false,
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
      }, { headers });
    }

    // If no valid postsale upsells, return simple confirmation
    if (!postsaleUpsells || postsaleUpsells.length === 0) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        customerName: order.full_name,
        showPostsale: false,
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
