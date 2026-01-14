/**
 * API endpoint pentru sanitizare și căutare coduri poștale
 * 
 * Folosit în aplicația de ecom pentru autocomplete coduri poștale
 * 
 * GET /api/postal-code/sanitize?county=vilcea&city=drgasani&address=str%20viilor%20numaru%205a
 */

import { NextRequest, NextResponse } from "next/server";
import { findPostalCodes } from "@/lib/postal-code-sanitizer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const county = searchParams.get("county") || "";
    const city = searchParams.get("city") || "";
    const address = searchParams.get("address") || "";

    if (!county || !city || !address) {
      return NextResponse.json(
        { 
          error: "Missing required parameters",
          required: ["county", "city", "address"]
        },
        { status: 400 }
      );
    }

    const results = await findPostalCodes(county, city, address);

    return NextResponse.json({
      success: true,
      postalCodes: results,
      sanitized: results[0]?.sanitizedAddress || null,
      count: results.length,
    });
  } catch (error) {
    console.error("Error in postal code sanitize API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
