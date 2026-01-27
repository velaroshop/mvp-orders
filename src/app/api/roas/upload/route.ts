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

interface CsvRow {
  date: string;
  amountSpent: number;
  metaPurchases: number;
  metaPurchaseValue: number;
}

/**
 * Parse Meta Ads CSV export
 * Expected columns: "Day", "Amount spent (RON)", "Purchases", "Purchases conversion value"
 */
function parseCsv(csvContent: string): CsvRow[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV file is empty or has no data rows");
  }

  // Parse header to find column indices
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  // Find column indices (case-insensitive, partial match)
  const findColumnIndex = (patterns: string[]): number => {
    for (const pattern of patterns) {
      const index = header.findIndex((h) =>
        h.toLowerCase().includes(pattern.toLowerCase())
      );
      if (index !== -1) return index;
    }
    return -1;
  };

  const dayIndex = findColumnIndex(["Day", "Date", "Zi"]);
  const spentIndex = findColumnIndex(["Amount spent", "Spent", "Cheltuieli"]);
  const purchasesIndex = findColumnIndex(["Purchases", "Achizitii"]);
  const purchaseValueIndex = findColumnIndex([
    "Purchases conversion value",
    "conversion value",
    "Purchase value",
  ]);

  if (dayIndex === -1) {
    throw new Error("Could not find 'Day' or 'Date' column in CSV");
  }
  if (spentIndex === -1) {
    throw new Error("Could not find 'Amount spent' column in CSV");
  }

  const rows: CsvRow[] = [];
  const dateAggregates: Map<string, CsvRow> = new Map();

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted values with commas)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const dateStr = values[dayIndex]?.replace(/"/g, "");
    if (!dateStr) continue;

    // Parse date (format: YYYY-MM-DD or DD/MM/YYYY)
    let parsedDate: string;
    if (dateStr.includes("-")) {
      parsedDate = dateStr; // Already YYYY-MM-DD
    } else if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        // Assume DD/MM/YYYY
        parsedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else {
        continue; // Skip invalid date
      }
    } else {
      continue; // Skip invalid date
    }

    // Parse numeric values (handle European format: 1.234,56)
    const parseNumber = (value: string | undefined): number => {
      if (!value) return 0;
      // Remove quotes and spaces
      let cleaned = value.replace(/"/g, "").trim();
      // Handle European format (1.234,56 -> 1234.56)
      if (cleaned.includes(",") && cleaned.includes(".")) {
        // European: 1.234,56
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      } else if (cleaned.includes(",")) {
        // Could be European decimal: 123,45
        cleaned = cleaned.replace(",", ".");
      }
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const amountSpent = parseNumber(values[spentIndex]);
    const metaPurchases =
      purchasesIndex !== -1 ? Math.round(parseNumber(values[purchasesIndex])) : 0;
    const metaPurchaseValue =
      purchaseValueIndex !== -1 ? parseNumber(values[purchaseValueIndex]) : 0;

    // Aggregate by date (sum all campaigns for the same day)
    const existing = dateAggregates.get(parsedDate);
    if (existing) {
      existing.amountSpent += amountSpent;
      existing.metaPurchases += metaPurchases;
      existing.metaPurchaseValue += metaPurchaseValue;
    } else {
      dateAggregates.set(parsedDate, {
        date: parsedDate,
        amountSpent,
        metaPurchases,
        metaPurchaseValue,
      });
    }
  }

  return Array.from(dateAggregates.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * POST /api/roas/upload - Upload Meta Ads CSV and store ad spend data
 * Body: JSON with 'csvContent' (string) and 'productId' (UUID)
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

    // Parse JSON body
    const body = await request.json();
    const { csvContent, productId } = body as { csvContent?: string; productId?: string };

    if (!csvContent) {
      return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json(
        { error: "No product selected" },
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

    // Parse CSV content
    let parsedRows: CsvRow[];

    try {
      parsedRows = parseCsv(csvContent);
    } catch (parseError: any) {
      return NextResponse.json(
        { error: `CSV parse error: ${parseError.message}` },
        { status: 400 }
      );
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { error: "No valid data rows found in CSV" },
        { status: 400 }
      );
    }

    // UPSERT data into ad_spend_data table
    const upsertData = parsedRows.map((row) => ({
      organization_id: organizationId,
      product_id: productId,
      date: row.date,
      amount_spent: row.amountSpent,
      meta_purchases: row.metaPurchases,
      meta_purchase_value: row.metaPurchaseValue,
      updated_at: new Date().toISOString(),
    }));

    const { data: upsertResult, error: upsertError } = await supabase
      .from("ad_spend_data")
      .upsert(upsertData, {
        onConflict: "organization_id,product_id,date",
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error("Error upserting ad spend data:", upsertError);
      return NextResponse.json(
        { error: "Failed to save ad spend data" },
        { status: 500 }
      );
    }

    // Get date range for summary
    const dates = parsedRows.map((r) => r.date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const totalSpent = parsedRows.reduce((sum, r) => sum + r.amountSpent, 0);

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
      },
      summary: {
        rowsImported: parsedRows.length,
        dateRange: { start: startDate, end: endDate },
        totalSpent,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/roas/upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
