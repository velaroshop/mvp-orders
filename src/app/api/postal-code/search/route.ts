/**
 * API route pentru căutarea codurilor poștale
 * Acest endpoint protejează API key-ul Geoapify și nu îl expune în frontend
 */

import { NextRequest, NextResponse } from "next/server";
import { searchPostalCodes } from "@/lib/postal-code/geoapify";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");
    const city = searchParams.get("city");
    const county = searchParams.get("county");
    const country = searchParams.get("country") || "Romania";

    if (!address || !city || !county) {
      return NextResponse.json(
        { error: "Missing required parameters: address, city, county" },
        { status: 400 }
      );
    }

    const results = await searchPostalCodes(address, city, county, country);

    return NextResponse.json({ postalCodes: results }, { status: 200 });
  } catch (error) {
    console.error("[Postal Code API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to search postal codes",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
