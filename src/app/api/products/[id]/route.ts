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
 * PUT /api/products/[id] - Update a product
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

    const { id: productId } = await params;
    const organizationId = session.user.activeOrganizationId;
    const body = await request.json();

    // Verify the product belongs to the user's organization
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("id, organization_id")
      .eq("id", productId)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (existingProduct.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Unauthorized - Product does not belong to your organization" },
        { status: 403 }
      );
    }

    // Validate required fields
    if (body.name !== undefined && (!body.name.trim() || body.name.trim().length > 50)) {
      return NextResponse.json(
        { error: "Name must be between 1 and 50 characters" },
        { status: 400 }
      );
    }

    if (body.sku !== undefined && (!body.sku || !body.sku.trim())) {
      return NextResponse.json(
        { error: "SKU is required" },
        { status: 400 }
      );
    }

    if (body.sku !== undefined && body.sku.trim().length > 10) {
      return NextResponse.json(
        { error: "SKU must not exceed 10 characters" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (body.status && body.status !== "active" && body.status !== "testing" && body.status !== "inactive") {
      return NextResponse.json(
        { error: "Status must be 'active', 'testing', or 'inactive'" },
        { status: 400 }
      );
    }

    // Normalize SKU to uppercase if provided
    const normalizedSku = body.sku !== undefined ? body.sku.trim().toUpperCase() : undefined;

    // Check if SKU already exists for another product in this organization (if SKU is being changed)
    if (normalizedSku !== undefined) {
      const { data: existingProductWithSku } = await supabase
        .from("products")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("sku", normalizedSku)
        .neq("id", productId)
        .single();

      if (existingProductWithSku) {
        return NextResponse.json(
          { error: "A product with this SKU already exists in your organization" },
          { status: 400 }
        );
      }
    }

    // Update the product
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (normalizedSku !== undefined) updateData.sku = normalizedSku;
    if (body.status !== undefined) updateData.status = body.status;

    const { data: product, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error in PUT /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id] - Delete a product
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

    const { id: productId } = await params;
    const organizationId = session.user.activeOrganizationId;

    // Verify the product belongs to the user's organization
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("id, organization_id")
      .eq("id", productId)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (existingProduct.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Unauthorized - Product does not belong to your organization" },
        { status: 403 }
      );
    }

    // Delete the product
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("Error deleting product:", error);
      return NextResponse.json(
        { error: "Failed to delete product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/products/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
