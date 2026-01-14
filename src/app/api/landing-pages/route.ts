import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Use service role key for API routes to bypass RLS
// We still validate organization_id from session
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
 * GET /api/landing-pages - List all landing pages for the current user's organization
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

    // Fetch landing pages with related product and store data
    const { data: landingPages, error } = await supabase
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
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching landing pages:", error);
      return NextResponse.json(
        { error: "Failed to fetch landing pages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ landingPages: landingPages || [] });
  } catch (error) {
    console.error("Error in GET /api/landing-pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/landing-pages - Create a new landing page
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
      productId,
      storeId,
      name,
      slug,
      thankYouPath,
      // Offer Settings
      mainSku,
      offerHeading1,
      offerHeading2,
      offerHeading3,
      numeral1,
      numeral2,
      numeral3,
      orderButtonText = "Plasează comanda!",
      // Pricing
      srp,
      price1,
      price2,
      price3,
      shippingPrice,
      postPurchaseStatus = false,
      // Conversion Tracking
      fbPixelId,
      fbConversionToken,
      clientSideTracking = false,
      serverSideTracking = false,
      customEventName,
    } = body;

    // Validate required fields
    if (!productId || !storeId || !name || !slug) {
      return NextResponse.json(
        { error: "Product, Store, Name, and Slug are required" },
        { status: 400 }
      );
    }

    // Validate pricing fields
    if (
      srp === undefined ||
      price1 === undefined ||
      price2 === undefined ||
      price3 === undefined ||
      shippingPrice === undefined
    ) {
      return NextResponse.json(
        { error: "All pricing fields (SRP, Price1, Price2, Price3, Shipping Price) are required" },
        { status: 400 }
      );
    }

    // Check if slug already exists for this organization
    const { data: existingPage } = await supabase
      .from("landing_pages")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("slug", slug)
      .single();

    if (existingPage) {
      return NextResponse.json(
        { error: "A landing page with this slug already exists" },
        { status: 400 }
      );
    }

    // Verify product and store belong to the organization
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("organization_id", organizationId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or does not belong to your organization" },
        { status: 400 }
      );
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("organization_id", organizationId)
      .single();

    if (!store) {
      return NextResponse.json(
        { error: "Store not found or does not belong to your organization" },
        { status: 400 }
      );
    }

    // Create the landing page
    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .insert({
        organization_id: organizationId,
        product_id: productId,
        store_id: storeId,
        name,
        slug,
        thank_you_path: thankYouPath || null,
        // Offer Settings
        main_sku: mainSku || null,
        offer_heading_1: offerHeading1 || null,
        offer_heading_2: offerHeading2 || null,
        offer_heading_3: offerHeading3 || null,
        numeral_1: numeral1 || null,
        numeral_2: numeral2 || null,
        numeral_3: numeral3 || null,
        order_button_text: orderButtonText,
        // Pricing
        srp,
        price_1: price1,
        price_2: price2,
        price_3: price3,
        shipping_price: shippingPrice,
        post_purchase_status: postPurchaseStatus,
        // Conversion Tracking
        fb_pixel_id: fbPixelId || null,
        fb_conversion_token: fbConversionToken || null,
        client_side_tracking: clientSideTracking,
        server_side_tracking: serverSideTracking,
        custom_event_name: customEventName || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating landing page:", error);
      return NextResponse.json(
        { error: "Failed to create landing page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ landingPage }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/landing-pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
