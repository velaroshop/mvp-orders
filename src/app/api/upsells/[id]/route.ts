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
 * GET /api/upsells/[id] - Get a single upsell by ID
 */
export async function GET(
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

    const organizationId = session.user.activeOrganizationId;
    const { id } = await params;

    const { data: upsell, error } = await supabase
      .from("upsells")
      .select(`
        *,
        product:products(id, name, sku),
        landing_page:landing_pages(id, slug, title)
      `)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (error || !upsell) {
      return NextResponse.json(
        { error: "Upsell not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ upsell });
  } catch (error) {
    console.error("Error in GET /api/upsells/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/upsells/[id] - Update an existing upsell
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

    const organizationId = session.user.activeOrganizationId;
    const { id } = await params;
    const body = await request.json();

    // Verify upsell exists and belongs to organization
    const { data: existingUpsell } = await supabase
      .from("upsells")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (!existingUpsell) {
      return NextResponse.json(
        { error: "Upsell not found or access denied" },
        { status: 404 }
      );
    }

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
      active,
      display_order,
    } = body;

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (landing_page_id !== undefined) {
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
      updates.landing_page_id = landing_page_id;
    }

    if (type !== undefined) {
      if (type !== "presale" && type !== "postsale") {
        return NextResponse.json(
          { error: "Type must be 'presale' or 'postsale'" },
          { status: 400 }
        );
      }
      updates.type = type;
    }

    if (product_id !== undefined) {
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
      updates.product_id = product_id;
    }

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description || null;
    if (quantity !== undefined) {
      if (quantity < 1) {
        return NextResponse.json(
          { error: "Quantity must be at least 1" },
          { status: 400 }
        );
      }
      updates.quantity = Number(quantity);
    }
    if (srp !== undefined) {
      if (srp < 0) {
        return NextResponse.json(
          { error: "SRP cannot be negative" },
          { status: 400 }
        );
      }
      updates.srp = Number(srp);
    }
    if (price !== undefined) {
      if (price < 0) {
        return NextResponse.json(
          { error: "Price cannot be negative" },
          { status: 400 }
        );
      }
      updates.price = Number(price);
    }
    if (media_url !== undefined) updates.media_url = media_url || null;
    if (active !== undefined) updates.active = active;
    if (display_order !== undefined) updates.display_order = Number(display_order);

    // Update the upsell
    const { data: upsell, error } = await supabase
      .from("upsells")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating upsell:", error);
      return NextResponse.json(
        { error: "Failed to update upsell" },
        { status: 500 }
      );
    }

    return NextResponse.json({ upsell });
  } catch (error) {
    console.error("Error in PUT /api/upsells/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upsells/[id] - Delete an upsell
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

    const organizationId = session.user.activeOrganizationId;
    const { id } = await params;

    // Verify upsell exists and belongs to organization
    const { data: existingUpsell } = await supabase
      .from("upsells")
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (!existingUpsell) {
      return NextResponse.json(
        { error: "Upsell not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the upsell
    const { error } = await supabase
      .from("upsells")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Error deleting upsell:", error);
      return NextResponse.json(
        { error: "Failed to delete upsell" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/upsells/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
