import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit-log";

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
 * GET /api/products - List all products for the current user's organization
 * OPTIMIZED: Fixed N+1 query problem by batching all queries
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

    // Fetch only main products (not variation children) for the organization
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .is("parent_product_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const productIds = products.map(p => p.id);

    // BATCH QUERY 1: Get all landing pages for all products at once
    const { data: allLandingPages } = await supabase
      .from("landing_pages")
      .select("product_id, slug")
      .in("product_id", productIds);

    // BATCH QUERY 2: Get all upsells for all products at once
    const { data: allUpsells } = await supabase
      .from("upsells")
      .select("product_id")
      .in("product_id", productIds);

    // Create maps for efficient lookup
    const landingPagesByProduct = new Map<string, string[]>();
    allLandingPages?.forEach(lp => {
      if (!landingPagesByProduct.has(lp.product_id)) {
        landingPagesByProduct.set(lp.product_id, []);
      }
      landingPagesByProduct.get(lp.product_id)!.push(lp.slug);
    });

    const upsellCountByProduct = new Map<string, number>();
    allUpsells?.forEach(u => {
      upsellCountByProduct.set(u.product_id, (upsellCountByProduct.get(u.product_id) || 0) + 1);
    });

    // BATCH QUERY 3: Get variation counts for all products at once
    const { data: allVariations } = await supabase
      .from("products")
      .select("parent_product_id, status")
      .in("parent_product_id", productIds);

    const variationCountByProduct = new Map<string, number>();
    allVariations?.forEach(v => {
      if (v.parent_product_id) {
        variationCountByProduct.set(v.parent_product_id, (variationCountByProduct.get(v.parent_product_id) || 0) + 1);
      }
    });

    // BATCH QUERY 4: Get all testing orders for all landing slugs at once
    const allLandingSlugs = [...new Set(allLandingPages?.map(lp => lp.slug) || [])];
    let testingOrdersBySlug = new Map<string, number>();

    if (allLandingSlugs.length > 0) {
      const { data: testingOrders } = await supabase
        .from("orders")
        .select("landing_key")
        .eq("status", "testing")
        .in("landing_key", allLandingSlugs);

      testingOrders?.forEach(order => {
        testingOrdersBySlug.set(
          order.landing_key,
          (testingOrdersBySlug.get(order.landing_key) || 0) + 1
        );
      });
    }

    // Combine data for each product (no more N+1 queries!)
    const productsWithCounts = products.map(product => {
      const productLandingSlugs = landingPagesByProduct.get(product.id) || [];
      const upsellCount = upsellCountByProduct.get(product.id) || 0;

      // Count testing orders across all landing pages for this product
      const testingOrdersCount = productLandingSlugs.reduce((sum, slug) => {
        return sum + (testingOrdersBySlug.get(slug) || 0);
      }, 0);

      return {
        ...product,
        testing_orders_count: testingOrdersCount,
        is_in_use: productLandingSlugs.length > 0 || upsellCount > 0,
        variations_count: variationCountByProduct.get(product.id) || 0,
      };
    });

    console.log(`[Products API] Returned ${productsWithCounts.length} products with 4 batch queries`);

    return NextResponse.json({ products: productsWithCounts });
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products - Create a new product
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
      name,
      sku,
      status = "active",
      parent_product_id,
      variation_visual_type,
      variation_visual_value,
      variation_display_order = 0,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!name.trim() || name.trim().length > 50) {
      return NextResponse.json(
        { error: "Name must be between 1 and 50 characters" },
        { status: 400 }
      );
    }

    if (!sku || !sku.trim()) {
      return NextResponse.json(
        { error: "SKU is required" },
        { status: 400 }
      );
    }

    // Variation products allow longer SKUs (e.g. "RDX-008-VERDE" = 13 chars)
    const isVariation = !!parent_product_id;
    const skuMaxLength = isVariation ? 30 : 10;
    if (sku.trim().length > skuMaxLength) {
      return NextResponse.json(
        { error: `SKU must not exceed ${skuMaxLength} characters` },
        { status: 400 }
      );
    }

    // Validate status
    if (status !== "active" && status !== "testing" && status !== "inactive") {
      return NextResponse.json(
        { error: "Status must be 'active', 'testing', or 'inactive'" },
        { status: 400 }
      );
    }

    // Validate visual type if provided
    if (variation_visual_type && !["image", "color"].includes(variation_visual_type)) {
      return NextResponse.json(
        { error: "variation_visual_type must be 'image' or 'color'" },
        { status: 400 }
      );
    }

    // Validate parent product exists and belongs to same org (if creating a variation)
    if (parent_product_id) {
      const { data: parentProduct } = await supabase
        .from("products")
        .select("id, organization_id, parent_product_id")
        .eq("id", parent_product_id)
        .single();

      if (!parentProduct || parentProduct.organization_id !== organizationId) {
        return NextResponse.json(
          { error: "Parent product not found" },
          { status: 404 }
        );
      }
      // Prevent nesting: a variation cannot itself be a parent of another variation
      if (parentProduct.parent_product_id) {
        return NextResponse.json(
          { error: "Cannot create a variation of a variation" },
          { status: 400 }
        );
      }
      // Max 6 variations per product
      const { count: existingCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("parent_product_id", parent_product_id);
      if ((existingCount || 0) >= 6) {
        return NextResponse.json(
          { error: "Maximum 6 variations per product" },
          { status: 400 }
        );
      }
    }

    // Normalize SKU to uppercase
    const normalizedSku = sku.trim().toUpperCase();

    // Check if SKU already exists for this organization
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("sku", normalizedSku)
      .single();

    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this SKU already exists in your organization" },
        { status: 400 }
      );
    }

    // Create the product
    const insertData: Record<string, any> = {
      organization_id: organizationId,
      name,
      sku: normalizedSku,
      status,
    };
    if (parent_product_id) {
      insertData.parent_product_id = parent_product_id;
      insertData.variation_visual_type = variation_visual_type || null;
      insertData.variation_visual_value = variation_visual_value || null;
      insertData.variation_display_order = variation_display_order;
    }

    const { data: product, error } = await supabase
      .from("products")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    logAudit({
      organizationId,
      userId: (session.user as any).id,
      userEmail: (session.user as any).email,
      entityType: "product",
      entityId: product.id,
      action: "create",
      metadata: { name, sku: normalizedSku },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
