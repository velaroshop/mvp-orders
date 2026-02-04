import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Get search query and pagination params from URL
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = parseInt(searchParams.get("offset") || "0");

    let totalCount = 0;
    let customersData: any[] = [];

    if (searchQuery.trim()) {
      // OPTIMIZED: Search using SQL ILIKE (case-insensitive) on phone field
      // Phone search is direct on customers table
      const { data: phoneMatches, error: phoneError, count } = await supabaseAdmin
        .from("customers")
        .select("*", { count: "exact" })
        .eq("organization_id", activeOrganizationId)
        .ilike("phone", `%${searchQuery}%`)
        .order("total_orders", { ascending: false })
        .range(offset, offset + limit - 1);

      if (phoneError) {
        throw new Error(`Failed to search customers: ${phoneError.message}`);
      }

      // For name search, we need to query orders table since names are stored there
      // Use a more efficient approach with SQL joins
      const { data: nameMatches, error: nameError } = await supabaseAdmin
        .from("orders")
        .select("customer_id, full_name, created_at")
        .eq("organization_id", activeOrganizationId)
        .ilike("full_name", `%${searchQuery}%`)
        .order("created_at", { ascending: false });

      if (nameError) {
        console.error("Name search error:", nameError);
      }

      // Get unique customer IDs from name matches
      const customerIdsFromNames = [...new Set(nameMatches?.map(o => o.customer_id) || [])];

      // Fetch customer details for name matches
      let nameMatchCustomers: any[] = [];
      if (customerIdsFromNames.length > 0) {
        const { data: nameCustomers } = await supabaseAdmin
          .from("customers")
          .select("*")
          .in("id", customerIdsFromNames)
          .eq("organization_id", activeOrganizationId)
          .order("total_orders", { ascending: false });

        nameMatchCustomers = nameCustomers || [];
      }

      // Combine phone and name matches, deduplicate by customer ID
      const customerMap = new Map();

      phoneMatches?.forEach(c => customerMap.set(c.id, c));
      nameMatchCustomers.forEach(c => {
        if (!customerMap.has(c.id)) {
          customerMap.set(c.id, c);
        }
      });

      customersData = Array.from(customerMap.values());
      totalCount = customersData.length;

      // Apply pagination to combined results
      customersData = customersData.slice(offset, offset + limit);

    } else {
      // No search - optimized query with pagination in DB
      const { data, error, count } = await supabaseAdmin
        .from("customers")
        .select("*", { count: "exact" })
        .eq("organization_id", activeOrganizationId)
        .order("total_orders", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to list customers: ${error.message}`);
      }

      customersData = data || [];
      totalCount = count || 0;
    }

    // Get latest order name and calculate confirmed totals for customers in current page (batch query)
    const customerIds = customersData.map(c => c.id);
    const customerNames = new Map<string, string>();
    const customerConfirmedTotals = new Map<string, number>();

    if (customerIds.length > 0) {
      // Get all orders for these customers to calculate confirmed totals and get names
      const { data: customerOrders } = await supabaseAdmin
        .from("orders")
        .select("customer_id, full_name, total, status, created_at")
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false });

      // Process orders: get latest name and sum confirmed totals
      customerOrders?.forEach(order => {
        // Map customer_id -> name (first occurrence is latest due to ORDER BY)
        if (!customerNames.has(order.customer_id)) {
          customerNames.set(order.customer_id, order.full_name);
        }

        // Sum only confirmed orders for totalSpent
        if (order.status === "confirmed") {
          const currentTotal = customerConfirmedTotals.get(order.customer_id) || 0;
          customerConfirmedTotals.set(
            order.customer_id,
            currentTotal + parseFloat(order.total?.toString() || "0")
          );
        }
      });
    }

    // Map to Customer type with names and confirmed-only totals
    const mappedCustomers = customersData.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      phone: row.phone,
      name: customerNames.get(row.id) || null,
      firstOrderDate: row.first_order_date,
      lastOrderDate: row.last_order_date,
      totalOrders: row.total_orders || 0,
      totalSpent: customerConfirmedTotals.get(row.id) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log(`[Customers List] Returned ${mappedCustomers.length} customers (search: "${searchQuery}", total: ${totalCount})`);

    return NextResponse.json({
      customers: mappedCustomers,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error listing customers", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
