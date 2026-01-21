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

    // First, get all customers with their latest order name
    // We'll use a subquery to get the most recent order's full_name for each customer
    let query = supabaseAdmin
      .from("customers")
      .select("*", { count: "exact" })
      .eq("organization_id", activeOrganizationId);

    // If search query provided, we need to search by phone or name
    // For name search, we'll need to join with orders
    const customers: any[] = [];
    let totalCount = 0;

    if (searchQuery.trim()) {
      // Get all customers (we'll filter by name later if needed)
      const { data: allCustomers, error: customersError } = await supabaseAdmin
        .from("customers")
        .select("*")
        .eq("organization_id", activeOrganizationId);

      if (customersError) {
        throw new Error(`Failed to fetch customers: ${customersError.message}`);
      }

      // Get the latest order for each customer to get their name
      const customerIds = allCustomers?.map(c => c.id) || [];

      if (customerIds.length > 0) {
        // Get latest order for each customer
        const { data: latestOrders } = await supabaseAdmin
          .from("orders")
          .select("customer_id, full_name")
          .in("customer_id", customerIds)
          .order("created_at", { ascending: false });

        // Create a map of customer_id -> name (first occurrence is the latest)
        const customerNames = new Map();
        latestOrders?.forEach(order => {
          if (!customerNames.has(order.customer_id)) {
            customerNames.set(order.customer_id, order.full_name);
          }
        });

        // Filter customers by search query (phone or name)
        const searchLower = searchQuery.toLowerCase();
        const filteredCustomers = allCustomers?.filter(customer => {
          const name = customerNames.get(customer.id) || "";
          return customer.phone.includes(searchQuery) ||
                 name.toLowerCase().includes(searchLower);
        }) || [];

        totalCount = filteredCustomers.length;

        // Apply pagination
        const paginatedCustomers = filteredCustomers.slice(offset, offset + limit);

        // Add names to customers
        paginatedCustomers.forEach(customer => {
          customers.push({
            ...customer,
            name: customerNames.get(customer.id) || null,
          });
        });
      }
    } else {
      // No search - just get paginated customers
      const { data, error, count } = await query
        .order("total_orders", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to list customers: ${error.message}`);
      }

      totalCount = count || 0;

      // Get latest order name for each customer in this page
      const customerIds = data?.map(c => c.id) || [];

      if (customerIds.length > 0) {
        const { data: latestOrders } = await supabaseAdmin
          .from("orders")
          .select("customer_id, full_name")
          .in("customer_id", customerIds)
          .order("created_at", { ascending: false });

        const customerNames = new Map();
        latestOrders?.forEach(order => {
          if (!customerNames.has(order.customer_id)) {
            customerNames.set(order.customer_id, order.full_name);
          }
        });

        data?.forEach(customer => {
          customers.push({
            ...customer,
            name: customerNames.get(customer.id) || null,
          });
        });
      }
    }

    // Map to Customer type
    const mappedCustomers = customers.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      phone: row.phone,
      name: row.name,
      firstOrderDate: row.first_order_date,
      lastOrderDate: row.last_order_date,
      totalOrders: row.total_orders || 0,
      totalSpent: parseFloat(row.total_spent?.toString() || "0"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

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
