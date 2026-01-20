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
 * GET /api/upsells/public/[landing_page_id] - Get presale upsells for a landing page (public)
 * Query params:
 * - type: Filter by type (presale/postsale) - defaults to presale
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ landing_page_id: string }> }
) {
  try {
    const { landing_page_id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "presale";

    // Validate type
    if (type !== "presale" && type !== "postsale") {
      return NextResponse.json(
        { error: "Type must be 'presale' or 'postsale'" },
        { status: 400 }
      );
    }

    console.log(`[API] Fetching ${type} upsells for landing page:`, landing_page_id);

    const { data: upsells, error } = await supabase
      .from("upsells")
      .select(`
        *,
        product:products!product_id(id, name, sku, status),
        landing_page:landing_pages!landing_page_id(id, slug, name)
      `)
      .eq("landing_page_id", landing_page_id)
      .eq("type", type)
      .eq("active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching upsells:", error);
      return NextResponse.json(
        { error: "Failed to fetch upsells" },
        { status: 500 }
      );
    }

    // Filter upsells based on product status
    // Only allow "active" products for both presale and postsale
    const activeUpsells = (upsells || []).filter(upsell => {
      const productStatus = upsell.product?.status;
      return productStatus === "active";
    });

    console.log(`[API] Found ${upsells?.length || 0} active ${type} upsells, ${activeUpsells.length} with available products`);
    return NextResponse.json({ upsells: activeUpsells });
  } catch (error) {
    console.error("Error in GET /api/upsells/public/[landing_page_id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
