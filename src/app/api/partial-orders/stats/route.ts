import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATUSES = ["pending", "accepted", "refused", "unanswered", "call_later", "duplicate"] as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any)?.activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Fetch all today's partials with their status in one query
    const { data: todayRows } = await supabaseAdmin
      .from("partial_orders")
      .select("status")
      .eq("organization_id", activeOrganizationId)
      .gte("created_at", todayStart.toISOString());

    const todayTotal = todayRows?.length ?? 0;

    // Count per status
    const statusCounts: Record<string, number> = {};
    for (const s of STATUSES) statusCounts[s] = 0;
    for (const row of todayRows ?? []) {
      if (row.status in statusCounts) statusCounts[row.status]++;
    }

    return NextResponse.json({
      todayTotal,
      statusBreakdown: STATUSES.map((s) => ({ status: s, count: statusCounts[s] })),
    });
  } catch (error) {
    console.error("Error fetching partial stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
