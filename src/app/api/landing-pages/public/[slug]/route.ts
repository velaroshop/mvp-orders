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

    // Fetch landing page (explicitly select SKU and quantity fields)
    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .select("*, main_sku, quantity_offer_1, quantity_offer_2, quantity_offer_3")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !landingPage) {
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
        .select("id, name, sku")
        .eq("id", productId)
        .single();
      productData = product;
    }

    if (storeId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, url, primary_color, accent_color, background_color, text_on_dark_color, thank_you_slug")
        .eq("id", storeId)
        .single();
      storeData = store;
    }

    return NextResponse.json({
      landingPage: {
        ...landingPage,
        products: productData,
        stores: storeData,
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
