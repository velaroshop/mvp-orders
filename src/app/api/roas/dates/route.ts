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
 * GET /api/roas/dates - Get all dates with ad spend data for a product
 * Query params:
 *   - productId: UUID of the product
 *   - month: Optional month filter in YYYY-MM format
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
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const month = searchParams.get("month"); // Optional: YYYY-MM format

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("ad_spend_data")
      .select("date, amount_spent, meta_purchases, meta_purchase_value, updated_at")
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .order("date", { ascending: true });

    // Add month filter if provided
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(Date.UTC(year, monthNum - 1, 1))
        .toISOString()
        .split("T")[0];
      const endDate = new Date(Date.UTC(year, monthNum, 0))
        .toISOString()
        .split("T")[0];

      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching ad spend dates:", error);
      return NextResponse.json(
        { error: "Failed to fetch dates" },
        { status: 500 }
      );
    }

    // Transform data
    const dates = (data || []).map((row: any) => ({
      date: row.date,
      amountSpent: parseFloat(row.amount_spent) || 0,
      metaPurchases: row.meta_purchases || 0,
      metaPurchaseValue: parseFloat(row.meta_purchase_value) || 0,
      updatedAt: row.updated_at,
    }));

    // Calculate totals
    const totals = dates.reduce(
      (acc, row) => ({
        amountSpent: acc.amountSpent + row.amountSpent,
        metaPurchases: acc.metaPurchases + row.metaPurchases,
        metaPurchaseValue: acc.metaPurchaseValue + row.metaPurchaseValue,
        daysCount: acc.daysCount + 1,
      }),
      { amountSpent: 0, metaPurchases: 0, metaPurchaseValue: 0, daysCount: 0 }
    );

    return NextResponse.json({
      dates,
      totals,
    });
  } catch (error) {
    console.error("Error in GET /api/roas/dates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roas/dates - Add or update ad spend data for a single date
 * Body: JSON with 'productId', 'date', 'amountSpent', and optionally 'metaPurchases', 'metaPurchaseValue'
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
    const { productId, date, amountSpent, metaPurchases, metaPurchaseValue } = body as {
      productId?: string;
      date?: string;
      amountSpent?: number;
      metaPurchases?: number;
      metaPurchaseValue?: number;
    };

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Valid date (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    if (amountSpent === undefined || amountSpent < 0) {
      return NextResponse.json(
        { error: "amountSpent must be a non-negative number" },
        { status: 400 }
      );
    }

    // Verify product belongs to organization
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .eq("organization_id", organizationId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found or access denied" },
        { status: 404 }
      );
    }

    // Upsert the ad spend data
    const { data: upsertResult, error: upsertError } = await supabase
      .from("ad_spend_data")
      .upsert(
        {
          organization_id: organizationId,
          product_id: productId,
          date: date,
          amount_spent: amountSpent,
          meta_purchases: metaPurchases || 0,
          meta_purchase_value: metaPurchaseValue || 0,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id,product_id,date",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Error upserting ad spend data:", upsertError);
      return NextResponse.json(
        { error: "Failed to save ad spend data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        date: upsertResult.date,
        amountSpent: parseFloat(upsertResult.amount_spent) || 0,
        metaPurchases: upsertResult.meta_purchases || 0,
        metaPurchaseValue: parseFloat(upsertResult.meta_purchase_value) || 0,
        updatedAt: upsertResult.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/roas/dates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roas/dates - Delete ad spend data for specific dates
 * Body: JSON with 'productId' and 'dates' (array of date strings)
 */
export async function DELETE(request: NextRequest) {
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
    const { productId, dates } = body as { productId?: string; dates?: string[] };

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: "dates array is required" },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from("ad_spend_data")
      .delete()
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .in("date", dates);

    if (error) {
      console.error("Error deleting ad spend dates:", error);
      return NextResponse.json(
        { error: "Failed to delete dates" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
    });
  } catch (error) {
    console.error("Error in DELETE /api/roas/dates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
