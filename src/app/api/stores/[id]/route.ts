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
 * PUT /api/stores/[id] - Update a store
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

    const { id: storeId } = await params;
    const organizationId = session.user.activeOrganizationId;
    const body = await request.json();

    // Verify the store belongs to the user's organization
    const { data: existingStore, error: fetchError } = await supabase
      .from("stores")
      .select("id, organization_id")
      .eq("id", storeId)
      .single();

    if (fetchError || !existingStore) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    if (existingStore.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Unauthorized - Store does not belong to your organization" },
        { status: 403 }
      );
    }

    // Update the store
    const updateData: any = {};
    if (body.url !== undefined) updateData.url = body.url;
    if (body.orderSeries !== undefined) updateData.order_series = body.orderSeries;
    if (body.primaryColor !== undefined) updateData.primary_color = body.primaryColor;
    if (body.accentColor !== undefined) updateData.accent_color = body.accentColor;
    if (body.backgroundColor !== undefined) updateData.background_color = body.backgroundColor;
    if (body.textOnDarkColor !== undefined) updateData.text_on_dark_color = body.textOnDarkColor;
    if (body.fbPixelId !== undefined) updateData.fb_pixel_id = body.fbPixelId || null;
    if (body.fbConversionToken !== undefined) updateData.fb_conversion_token = body.fbConversionToken || null;
    if (body.clientSideTracking !== undefined) updateData.client_side_tracking = body.clientSideTracking;
    if (body.serverSideTracking !== undefined) updateData.server_side_tracking = body.serverSideTracking;

    const { data: store, error } = await supabase
      .from("stores")
      .update(updateData)
      .eq("id", storeId)
      .select()
      .single();

    if (error) {
      console.error("Error updating store:", error);
      return NextResponse.json(
        { error: "Failed to update store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error("Error in PUT /api/stores/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stores/[id] - Delete a store
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

    const { id: storeId } = await params;
    const organizationId = session.user.activeOrganizationId;

    // Verify the store belongs to the user's organization
    const { data: existingStore, error: fetchError } = await supabase
      .from("stores")
      .select("id, organization_id")
      .eq("id", storeId)
      .single();

    if (fetchError || !existingStore) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    if (existingStore.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Unauthorized - Store does not belong to your organization" },
        { status: 403 }
      );
    }

    // Delete the store
    const { error } = await supabase
      .from("stores")
      .delete()
      .eq("id", storeId);

    if (error) {
      console.error("Error deleting store:", error);
      return NextResponse.json(
        { error: "Failed to delete store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/stores/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
