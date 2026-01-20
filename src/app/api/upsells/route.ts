import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

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
 * GET /api/upsells - List all upsells for the current user's organization
 * Query params:
 * - landing_page_id: Filter by landing page
 * - type: Filter by type (presale/postsale)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized - No active organization" },
        { status: 401 }
      );
    }

    const organizationId = session.user.activeOrganizationId;
    const { searchParams } = new URL(request.url);
    const landingPageId = searchParams.get("landing_page_id");
    const type = searchParams.get("type");

    let query = supabase
      .from("upsells")
      .select(`
        *,
        product:products!product_id(id, name, sku, status),
        landing_page:landing_pages!landing_page_id(id, slug, name)
      `)
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: true });

    if (landingPageId) {
      query = query.eq("landing_page_id", landingPageId);
    }

    if (type && (type === "presale" || type === "postsale")) {
      query = query.eq("type", type);
    }

    const { data: upsells, error } = await query;

    if (error) {
      console.error("Error fetching upsells:", error);
      return NextResponse.json(
        { error: "Failed to fetch upsells" },
        { status: 500 }
      );
    }

    console.log(`📦 API returning ${upsells?.length || 0} upsells for org ${organizationId}`);
    return NextResponse.json({ upsells: upsells || [] });
  } catch (error) {
    console.error("Error in GET /api/upsells:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/upsells - Create a new upsell
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized - No active organization" },
        { status: 401 }
      );
    }

    const organizationId = session.user.activeOrganizationId;
    const body = await request.json();

    const {
      landing_page_id,
      type,
      product_id,
      title,
      description,
      quantity,
      srp,
      price,
      media_url,
      active = true,
      display_order = 0,
    } = body;

    // Validate required fields
    if (!landing_page_id || !type || !product_id || !title || !quantity || srp === undefined || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== "presale" && type !== "postsale") {
      return NextResponse.json(
        { error: "Type must be 'presale' or 'postsale'" },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    if (srp < 0 || price < 0) {
      return NextResponse.json(
        { error: "Prices cannot be negative" },
        { status: 400 }
      );
    }

    // Verify landing page belongs to organization
    const { data: landingPage } = await supabase
      .from("landing_pages")
      .select("id")
      .eq("id", landing_page_id)
      .eq("organization_id", organizationId)
      .single();

    if (!landingPage) {
      return NextResponse.json(
        { error: "Landing page not found or access denied" },
        { status: 404 }
      );
    }

    // Verify product belongs to organization
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", product_id)
      .eq("organization_id", organizationId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or access denied" },
        { status: 404 }
      );
    }

    // Create the upsell
    const { data: upsell, error } = await supabase
      .from("upsells")
      .insert({
        organization_id: organizationId,
        landing_page_id,
        type,
        product_id,
        title,
        description: description || null,
        quantity: Number(quantity),
        srp: Number(srp),
        price: Number(price),
        media_url: media_url || null,
        active,
        display_order: Number(display_order),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating upsell:", error);
      return NextResponse.json(
        { error: "Failed to create upsell" },
        { status: 500 }
      );
    }

    return NextResponse.json({ upsell }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/upsells:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
