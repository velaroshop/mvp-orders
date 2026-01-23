import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Lista de domenii permise pentru CORS
// Adaugă aici toate domeniile tale de landing pages
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://mvp-orders.vercel.app',
  // Adaugă domeniile tale de producție aici
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin');

  // Verifică dacă originea e în lista permisă sau dacă e un subdomeniu al domeniilor permise
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGINS.some(allowed => origin.endsWith(allowed.replace('https://', '.').replace('http://', '.')))
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function GET(request: Request) {
  const headers = getCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order");

    console.log("[Thank You Verify] Request for orderId:", orderId);

    if (!orderId) {
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
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404, headers }
      );
    }

    console.log("[Thank You Verify] Fetching landing page with slug:", order.landing_key);

    // Fetch landing page and store details separately
    const { data: landingPage, error: landingError } = await supabaseAdmin
      .from("landing_pages")
      .select(`
        id,
        slug,
        post_purchase_status,
        stores(
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
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404, headers }
      );
    }

    const store = (landingPage as any).stores;

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: Request) {
  const headers = getCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}
