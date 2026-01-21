import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public endpoint - use service role to bypass RLS for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * GET /api/landing-pages/public/[slug] - Get landing page data by slug (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch landing page (explicitly select SKU, quantity and price fields + tracking fields)
    console.log("[API] Querying landing page with slug:", slug);
    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .select("*, main_sku, quantity_offer_1, quantity_offer_2, quantity_offer_3, price_1, price_2, price_3, fb_pixel_id, client_side_tracking")
      .eq("slug", slug)
      // Removed status check - landing pages may have different status values
      .single();

    console.log("[API] Landing page query result:", { data: landingPage, error });

    if (error || !landingPage) {
      console.error("[API] Landing page not found. Error:", error);
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    // Fetch related product and store separately
    const productId = landingPage.product_id;
    const storeId = landingPage.store_id;

    let productData = null;
    let storeData = null;

    if (productId) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, sku, status")
        .eq("id", productId)
        .single();
      productData = product;
    }

    if (storeId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, url, primary_color, accent_color, background_color, text_on_dark_color, thank_you_slug, organization_id")
        .eq("id", storeId)
        .single();
      storeData = store;
    }

    // Fetch test mode settings from organization settings
    let metaTestMode = false;
    let metaTestEventCode = null;
    if (storeData?.organization_id) {
      const { data: settings } = await supabase
        .from("settings")
        .select("meta_test_mode, meta_test_event_code")
        .eq("organization_id", storeData.organization_id)
        .single();

      if (settings) {
        metaTestMode = settings.meta_test_mode || false;
        metaTestEventCode = settings.meta_test_event_code || null;
      }
    }

    return NextResponse.json({
      landingPage: {
        ...landingPage,
        products: productData,
        stores: storeData,
        meta_test_mode: metaTestMode,
        meta_test_event_code: metaTestEventCode,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/landing-pages/public/[slug]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
