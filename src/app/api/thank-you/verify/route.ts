import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, landing_key, full_name, queue_expires_at, upsells")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

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

    if (landingError || !landingPage) {
      console.error("Error fetching landing page:", landingError);
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
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
      });
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
      });
    }

    // If no valid postsale upsells, return simple confirmation
    if (!postsaleUpsells || postsaleUpsells.length === 0) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        customerName: order.full_name,
        showPostsale: false,
      });
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
    });
  } catch (error) {
    console.error("Error verifying order for thank you page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
