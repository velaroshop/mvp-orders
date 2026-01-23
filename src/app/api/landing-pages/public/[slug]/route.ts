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
 * OPTIMIZED: Parallelized queries and includes presale upsells
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch landing page first (we need IDs for parallel queries)
    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .select("*, main_sku, quantity_offer_1, quantity_offer_2, quantity_offer_3, price_1, price_2, price_3, fb_pixel_id, client_side_tracking")
      .eq("slug", slug)
      .single();

    if (error || !landingPage) {
      console.error("[API] Landing page not found. Error:", error);
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    // PARALLEL: Fetch product, store, and presale upsells simultaneously
    const [productResult, storeResult, upsellsResult] = await Promise.all([
      // Product query
      landingPage.product_id
        ? supabase
            .from("products")
            .select("id, name, sku, status")
            .eq("id", landingPage.product_id)
            .single()
        : Promise.resolve({ data: null }),

      // Store query
      landingPage.store_id
        ? supabase
            .from("stores")
            .select("id, url, primary_color, accent_color, background_color, text_on_dark_color, thank_you_slug, organization_id")
            .eq("id", landingPage.store_id)
            .single()
        : Promise.resolve({ data: null }),

      // Presale upsells query
      supabase
        .from("upsells")
        .select("id, title, description, quantity, price, srp, media_url, active, products(name, sku, status)")
        .eq("landing_page_id", landingPage.id)
        .eq("type", "presale")
        .eq("active", true)
        .order("sort_order", { ascending: true })
    ]);

    const productData = productResult.data;
    const storeData = storeResult.data;
    const presaleUpsells = upsellsResult.data || [];

    // Fetch settings only if we have organization_id (still parallel-safe)
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
      presaleUpsells, // Include presale upsells in response
    });
  } catch (error) {
    console.error("Error in GET /api/landing-pages/public/[slug]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
