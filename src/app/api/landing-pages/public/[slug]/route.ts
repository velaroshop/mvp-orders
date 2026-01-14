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

    // Fetch landing page with related product and store data
    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .select(`
        *,
        products:product_id (
          id,
          name,
          sku
        ),
        stores:store_id (
          id,
          url
        )
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    return NextResponse.json({
      landingPage: {
        ...landingPage,
        products: product,
        stores: store,
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
