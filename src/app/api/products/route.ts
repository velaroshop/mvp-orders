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

    // For each product, get count of testing orders
    const productsWithCounts = await Promise.all(
      (products || []).map(async (product) => {
        // First, get all landing page slugs for this product
        const { data: landingPages } = await supabase
          .from("landing_pages")
          .select("slug")
          .eq("product_id", product.id);

        if (!landingPages || landingPages.length === 0) {
          return {
            ...product,
            testing_orders_count: 0,
          };
        }

        const landingSlugs = landingPages.map((lp) => lp.slug);

        // Then count testing orders for those landing pages (using landing_key)
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "testing")
          .in("landing_key", landingSlugs);

        return {
          ...product,
          testing_orders_count: count || 0,
        };
      })
    );

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

    if (!name.trim() || name.trim().length > 100) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    if (!sku || !sku.trim()) {
      return NextResponse.json(
        { error: "SKU is required" },
        { status: 400 }
      );
    }

    if (sku.trim().length > 50) {
      return NextResponse.json(
        { error: "SKU must not exceed 50 characters" },
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
