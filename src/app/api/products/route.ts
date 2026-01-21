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

    // Fetch products for the organization
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
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

    // BATCH QUERY 3: Get all testing orders for all landing slugs at once
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
      };
    });

    console.log(`[Products API] Returned ${productsWithCounts.length} products with 3 batch queries instead of ${products.length * 3} individual queries`);

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

    if (sku.trim().length > 10) {
      return NextResponse.json(
        { error: "SKU must not exceed 10 characters" },
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
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        organization_id: organizationId,
        name,
        sku: normalizedSku,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
