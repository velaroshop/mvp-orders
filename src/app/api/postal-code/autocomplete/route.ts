import { NextRequest, NextResponse } from "next/server";
import { searchAddressAutocomplete, searchByType } from "@/lib/postal-code/autocomplete";

/**
 * GET /api/postal-code/autocomplete - Get address autocomplete suggestions
 * 
 * Query params:
 * - text: string (required) - Text to search for
 * - type?: "county" | "city" | "street" | "postcode" - Filter by type
 * - limit?: number - Max results (default: 10)
 * - filter?: string - Geoapify filter (default: countrycode:ro)
 * - bias?: string - Geoapify bias
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text");
    const type = searchParams.get("type") as "county" | "city" | "street" | "postcode" | null;
    const limit = parseInt(searchParams.get("limit") || "10");
    const filter = searchParams.get("filter") || "countrycode:ro";
    const bias = searchParams.get("bias") || undefined;

    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        { error: "Text parameter is required and must be at least 2 characters" },
        { status: 400 }
      );
    }

    let results;
    if (type) {
      results = await searchByType(text, type, { limit, filter, bias });
    } else {
      results = await searchAddressAutocomplete(text, { limit, filter, bias });
    }

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error in autocomplete API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
