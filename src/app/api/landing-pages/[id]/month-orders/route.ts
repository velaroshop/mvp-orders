import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const PAGE_SIZE = 1000;
const CONFIRMED_STATUSES = new Set(["confirmed", "scheduled"]);
const OFFER_CODES = ["offer_1", "offer_2", "offer_3"] as const;

/**
 * GET /api/landing-pages/[id]/month-orders
 * Order counts per offer for the current calendar month (Europe/Bucharest),
 * split into confirmed, cancelled and still undecided. Testing orders excluded.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: landingPageId } = await params;
    const { data: landingPage } = await supabaseAdmin
      .from("landing_pages")
      .select("slug")
      .eq("id", landingPageId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!landingPage) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    const since = startOfMonthBucharest();
    const offers = OFFER_CODES.map(() => ({ confirmed: 0, cancelled: 0, pending: 0 }));

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error } = await supabaseAdmin
        .from("orders")
        .select("offer_code, status")
        .eq("organization_id", organizationId)
        .eq("landing_key", landingPage.slug)
        .neq("status", "testing")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[MonthOrders] DB error:", error.message);
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
      }

      for (const order of page || []) {
        const index = (OFFER_CODES as readonly string[]).indexOf(order.offer_code);
        if (index === -1) continue;
        if (CONFIRMED_STATUSES.has(order.status)) offers[index].confirmed++;
        else if (order.status === "cancelled") offers[index].cancelled++;
        else offers[index].pending++;
      }

      if (!page || page.length < PAGE_SIZE) break;
    }

    return NextResponse.json({ since, offers });
  } catch (error) {
    console.error("Error in GET /api/landing-pages/[id]/month-orders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function startOfMonthBucharest(): string {
  const partsOf = (date: Date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Bucharest",
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      })
        .formatToParts(date)
        .map((p) => [p.type, Number(p.value)])
    );

  const now = partsOf(new Date());
  const utcMidnight = Date.UTC(now.year, now.month - 1, 1);
  const local = partsOf(new Date(utcMidnight));
  const offsetMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - utcMidnight;
  return new Date(utcMidnight - offsetMs).toISOString();
}
