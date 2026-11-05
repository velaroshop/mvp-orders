import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { parsePartialPeriod, partialPeriodRange } from "@/lib/partial-period";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATUSES = ["pending", "accepted", "refused", "unanswered", "call_later", "duplicate"] as const;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any)?.activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = parsePartialPeriod(searchParams.get("period"), "today");
    const { start, end } = partialPeriodRange(period);

    // One count per status: a long period holds far more rows than a single query returns
    const countFor = async (status?: string) => {
      let query = supabaseAdmin
        .from("partial_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId);
      if (start) query = query.gte("created_at", start);
      if (end) query = query.lte("created_at", end);
      if (status) query = query.eq("status", status);
      const { count } = await query;
      return count ?? 0;
    };

    const [total, ...counts] = await Promise.all([countFor(), ...STATUSES.map((s) => countFor(s))]);

    return NextResponse.json({
      period,
      total,
      statusBreakdown: STATUSES.map((s, i) => ({ status: s, count: counts[i] })),
    });
  } catch (error) {
    console.error("Error fetching partial stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
