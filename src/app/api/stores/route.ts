import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/stores - List all stores for the current user's organization
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

    // Fetch stores for the organization
    const { data: stores, error } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching stores:", error);
      return NextResponse.json(
        { error: "Failed to fetch stores" },
        { status: 500 }
      );
    }

    return NextResponse.json({ stores: stores || [] });
  } catch (error) {
    console.error("Error in GET /api/stores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stores - Create a new store
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
      url,
      orderSeries = "VLR",
      primaryColor = "#FF6B00",
      accentColor = "#00A854",
      backgroundColor = "#2C3E50",
      fbPixelId = "",
      fbConversionToken = "",
      clientSideTracking = false,
      serverSideTracking = false,
    } = body;

    // Validate required fields
    if (!url || !orderSeries) {
      return NextResponse.json(
        { error: "URL and Order Series are required" },
        { status: 400 }
      );
    }

    // Check if URL already exists for this organization
    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("url", url)
      .single();

    if (existingStore) {
      return NextResponse.json(
        { error: "A store with this URL already exists" },
        { status: 400 }
      );
    }

    // Create the store
    const { data: store, error } = await supabase
      .from("stores")
      .insert({
        organization_id: organizationId,
        url,
        order_series: orderSeries,
        primary_color: primaryColor,
        accent_color: accentColor,
        background_color: backgroundColor,
        fb_pixel_id: fbPixelId || null,
        fb_conversion_token: fbConversionToken || null,
        client_side_tracking: clientSideTracking,
        server_side_tracking: serverSideTracking,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating store:", error);
      return NextResponse.json(
        { error: "Failed to create store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/stores:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
