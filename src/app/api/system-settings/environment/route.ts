import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/system-settings/environment - Get current Helpship environment
 * Requires authentication but not superadmin privileges
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch system settings (should be only one row)
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("helpship_environment")
      .single();

    if (error) {
      console.error("Error fetching system settings:", error);
      // Default to production if settings not found
      return NextResponse.json({ environment: "production" });
    }

    return NextResponse.json({ environment: data.helpship_environment });
  } catch (error) {
    console.error("Error in GET /api/system-settings/environment:", error);
    // Default to production on error
    return NextResponse.json({ environment: "production" });
  }
}
