import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadBreakEven } from "@/lib/break-even-data";

/**
 * GET /api/superadmin/break-even
 * Per product: CPA max / stop / scale thresholds (from mature orders), real CPA on the last
 * 3 and 7 closed days (ad spend of the product's campaigns / placed orders) and a verdict.
 * Read-only. Superadmin only.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.activeRole !== "owner" || !user.isSuperadminOrg) {
      return NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 });
    }
    const organizationId: string | undefined = user.activeOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    return NextResponse.json(await loadBreakEven(organizationId));
  } catch (error) {
    console.error("Error in GET /api/superadmin/break-even:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
