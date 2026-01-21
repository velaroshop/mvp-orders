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

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10); // Default 100 landing pages
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Fetch landing pages WITH PAGINATION
    const { data: landingPages, error, count } = await supabase
      .from("landing_pages")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching landing pages:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch landing pages", details: error.message },
        { status: 500 }
      );
    }

    // Fetch related products and stores separately
    const productIds = [...new Set((landingPages || []).map((lp: any) => lp.product_id).filter(Boolean))];
    const storeIds = [...new Set((landingPages || []).map((lp: any) => lp.store_id).filter(Boolean))];

    const productsMap = new Map();
    const storesMap = new Map();

    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, sku, status")
        .in("id", productIds);

      if (products) {
        products.forEach((p: any) => productsMap.set(p.id, p));
      }
    }

    if (storeIds.length > 0) {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, url")
        .in("id", storeIds);
      
      if (stores) {
        stores.forEach((s: any) => storesMap.set(s.id, s));
      }
    }

    // Combine data
    const landingPagesWithRelations = (landingPages || []).map((lp: any) => ({
      ...lp,
      products: lp.product_id ? productsMap.get(lp.product_id) : null,
      stores: lp.store_id ? storesMap.get(lp.store_id) : null,
    }));

    return NextResponse.json({
      landingPages: landingPagesWithRelations,
      total: count || 0,
      limit,
      offset,
    });
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
    } = body;

    // Validate required fields
    if (!productId || !storeId || !name || !slug || !thankYouPath) {
      return NextResponse.json(
        { error: "Product, Store, Name, Slug, and Thank You Path are required" },
        { status: 400 }
      );
    }

    // Validate offer settings
    if (!offerHeading1 || !offerHeading2 || !offerHeading3) {
      return NextResponse.json(
        { error: "All offer headings (1, 2, 3) are required" },
        { status: 400 }
      );
    }

    if (!numeral1 || !numeral2 || !numeral3) {
      return NextResponse.json(
        { error: "All numerals (1, 2, 3) are required" },
        { status: 400 }
      );
    }

    if (!orderButtonText) {
      return NextResponse.json(
        { error: "Order Button Text is required" },
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
    const insertData: any = {
      organization_id: organizationId,
      product_id: productId,
      store_id: storeId,
      name,
      slug,
    };

    // Required fields
    insertData.thank_you_path = thankYouPath;
    insertData.main_sku = mainSku || null; // Populated automatically from product
    insertData.offer_heading_1 = offerHeading1;
    insertData.offer_heading_2 = offerHeading2;
    insertData.offer_heading_3 = offerHeading3;
    insertData.numeral_1 = numeral1;
    insertData.numeral_2 = numeral2;
    insertData.numeral_3 = numeral3;
    insertData.order_button_text = orderButtonText;
    
    // Pricing (required)
    insertData.srp = srp;
    insertData.price_1 = price1;
    insertData.price_2 = price2;
    insertData.price_3 = price3;
    insertData.shipping_price = shippingPrice;
    if (postPurchaseStatus !== undefined) insertData.post_purchase_status = postPurchaseStatus;
    
    // Conversion Tracking (optional)
    if (fbPixelId !== undefined) insertData.fb_pixel_id = fbPixelId || null;
    if (fbConversionToken !== undefined) insertData.fb_conversion_token = fbConversionToken || null;
    if (clientSideTracking !== undefined) insertData.client_side_tracking = clientSideTracking;
    if (serverSideTracking !== undefined) insertData.server_side_tracking = serverSideTracking;

    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating landing page:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      console.error("Insert data:", JSON.stringify(insertData, null, 2));
      return NextResponse.json(
        { error: "Failed to create landing page", details: error.message },
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
