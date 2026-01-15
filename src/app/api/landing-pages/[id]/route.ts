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
 * PUT /api/landing-pages/[id] - Update a landing page
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized - No active organization" },
        { status: 401 }
      );
    }

    const { id: landingPageId } = await params;
    const organizationId = session.user.activeOrganizationId;
    const body = await request.json();

    // Verify the landing page belongs to the user's organization
    const { data: existingPage, error: fetchError } = await supabase
      .from("landing_pages")
      .select("id, organization_id, slug")
      .eq("id", landingPageId)
      .single();

    if (fetchError || !existingPage) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    if (existingPage.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Unauthorized - Landing page does not belong to your organization" },
        { status: 403 }
      );
    }

    // If product or store is being changed, verify they belong to organization
    if (body.productId) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("id", body.productId)
        .eq("organization_id", organizationId)
        .single();

      if (!product) {
        return NextResponse.json(
          { error: "Product not found or does not belong to your organization" },
          { status: 400 }
        );
      }
    }

    if (body.storeId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("id", body.storeId)
        .eq("organization_id", organizationId)
        .single();

      if (!store) {
        return NextResponse.json(
          { error: "Store not found or does not belong to your organization" },
          { status: 400 }
        );
      }
    }

    // If slug is being changed, check for duplicates
    if (body.slug && body.slug !== existingPage.slug) {
      const { data: duplicatePage } = await supabase
        .from("landing_pages")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("slug", body.slug)
        .neq("id", landingPageId)
        .single();

      if (duplicatePage) {
        return NextResponse.json(
          { error: "A landing page with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Validate required fields if they're being updated
    if (body.thankYouPath !== undefined && !body.thankYouPath) {
      return NextResponse.json(
        { error: "Thank You Path is required" },
        { status: 400 }
      );
    }

    if (body.offerHeading1 !== undefined && !body.offerHeading1) {
      return NextResponse.json(
        { error: "Offer Heading 1 is required" },
        { status: 400 }
      );
    }

    if (body.offerHeading2 !== undefined && !body.offerHeading2) {
      return NextResponse.json(
        { error: "Offer Heading 2 is required" },
        { status: 400 }
      );
    }

    if (body.offerHeading3 !== undefined && !body.offerHeading3) {
      return NextResponse.json(
        { error: "Offer Heading 3 is required" },
        { status: 400 }
      );
    }

    if (body.numeral1 !== undefined && !body.numeral1) {
      return NextResponse.json(
        { error: "Numeral 1 is required" },
        { status: 400 }
      );
    }

    if (body.numeral2 !== undefined && !body.numeral2) {
      return NextResponse.json(
        { error: "Numeral 2 is required" },
        { status: 400 }
      );
    }

    if (body.numeral3 !== undefined && !body.numeral3) {
      return NextResponse.json(
        { error: "Numeral 3 is required" },
        { status: 400 }
      );
    }

    if (body.orderButtonText !== undefined && !body.orderButtonText) {
      return NextResponse.json(
        { error: "Order Button Text is required" },
        { status: 400 }
      );
    }

    // Update the landing page
    const updateData: any = {};
    if (body.productId !== undefined) updateData.product_id = body.productId;
    if (body.storeId !== undefined) updateData.store_id = body.storeId;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.thankYouPath !== undefined) updateData.thank_you_path = body.thankYouPath;

    // Product SKU & Quantities
    if (body.productSku !== undefined) updateData.product_sku = body.productSku || null;
    if (body.quantityOffer1 !== undefined) updateData.quantity_offer_1 = body.quantityOffer1;
    if (body.quantityOffer2 !== undefined) updateData.quantity_offer_2 = body.quantityOffer2;
    if (body.quantityOffer3 !== undefined) updateData.quantity_offer_3 = body.quantityOffer3;

    // Offer Settings
    if (body.mainSku !== undefined) updateData.main_sku = body.mainSku || null;
    if (body.offerHeading1 !== undefined) updateData.offer_heading_1 = body.offerHeading1;
    if (body.offerHeading2 !== undefined) updateData.offer_heading_2 = body.offerHeading2;
    if (body.offerHeading3 !== undefined) updateData.offer_heading_3 = body.offerHeading3;
    if (body.numeral1 !== undefined) updateData.numeral_1 = body.numeral1;
    if (body.numeral2 !== undefined) updateData.numeral_2 = body.numeral2;
    if (body.numeral3 !== undefined) updateData.numeral_3 = body.numeral3;
    if (body.orderButtonText !== undefined) updateData.order_button_text = body.orderButtonText;
    
    // Pricing
    if (body.srp !== undefined) updateData.srp = body.srp;
    if (body.price1 !== undefined) updateData.price_1 = body.price1;
    if (body.price2 !== undefined) updateData.price_2 = body.price2;
    if (body.price3 !== undefined) updateData.price_3 = body.price3;
    if (body.shippingPrice !== undefined) updateData.shipping_price = body.shippingPrice;
    if (body.postPurchaseStatus !== undefined) updateData.post_purchase_status = body.postPurchaseStatus;
    
    // Conversion Tracking
    if (body.fbPixelId !== undefined) updateData.fb_pixel_id = body.fbPixelId || null;
    if (body.fbConversionToken !== undefined) updateData.fb_conversion_token = body.fbConversionToken || null;
    if (body.clientSideTracking !== undefined) updateData.client_side_tracking = body.clientSideTracking;
    if (body.serverSideTracking !== undefined) updateData.server_side_tracking = body.serverSideTracking;
    if (body.customEventName !== undefined) updateData.custom_event_name = body.customEventName || null;

    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .update(updateData)
      .eq("id", landingPageId)
      .select()
      .single();

    if (error) {
      console.error("Error updating landing page:", error);
      return NextResponse.json(
        { error: "Failed to update landing page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ landingPage });
  } catch (error) {
    console.error("Error in PUT /api/landing-pages/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/landing-pages/[id] - Delete a landing page
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized - No active organization" },
        { status: 401 }
      );
    }

    const { id: landingPageId } = await params;
    const organizationId = session.user.activeOrganizationId;

    // Verify the landing page belongs to the user's organization
    const { data: existingPage, error: fetchError } = await supabase
      .from("landing_pages")
      .select("id, organization_id")
      .eq("id", landingPageId)
      .single();

    if (fetchError || !existingPage) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    if (existingPage.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Unauthorized - Landing page does not belong to your organization" },
        { status: 403 }
      );
    }

    // Delete the landing page
    const { error } = await supabase
      .from("landing_pages")
      .delete()
      .eq("id", landingPageId);

    if (error) {
      console.error("Error deleting landing page:", error);
      return NextResponse.json(
        { error: "Failed to delete landing page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/landing-pages/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
