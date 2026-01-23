import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/superadmin/organizations - List all organizations (superadmin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;

    // Check if user is OWNER and from a superadmin organization
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json(
        { error: "Access denied. Superadmin privileges required." },
        { status: 403 }
      );
    }

    // Fetch all organizations with member count
    const { data: organizations, error } = await supabaseAdmin
      .from("organizations")
      .select(`
        id,
        name,
        slug,
        is_active,
        is_pending,
        is_superadmin,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 }
      );
    }

    // Get member counts for each organization
    const orgIds = organizations?.map((o) => o.id) || [];

    const { data: memberCounts } = await supabaseAdmin
      .from("organization_members")
      .select("organization_id")
      .in("organization_id", orgIds)
      .eq("is_active", true);

    // Count members per organization
    const memberCountMap = new Map<string, number>();
    memberCounts?.forEach((m) => {
      const count = memberCountMap.get(m.organization_id) || 0;
      memberCountMap.set(m.organization_id, count + 1);
    });

    // Get owner email for each organization
    const { data: owners } = await supabaseAdmin
      .from("organization_members")
      .select(`
        organization_id,
        users (
          email,
          name
        )
      `)
      .in("organization_id", orgIds)
      .eq("role", "owner")
      .eq("is_active", true);

    const ownerMap = new Map<string, { email: string; name: string }>();
    owners?.forEach((o: any) => {
      if (o.users) {
        ownerMap.set(o.organization_id, {
          email: o.users.email,
          name: o.users.name,
        });
      }
    });

    // Map organizations with additional data
    const mappedOrganizations = (organizations || []).map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.is_active,
      isPending: org.is_pending,
      isSuperadmin: org.is_superadmin,
      memberCount: memberCountMap.get(org.id) || 0,
      owner: ownerMap.get(org.id) || null,
      createdAt: org.created_at,
      updatedAt: org.updated_at,
    }));

    // Sort: superadmin orgs first, then by created_at desc
    mappedOrganizations.sort((a, b) => {
      if (a.isSuperadmin && !b.isSuperadmin) return -1;
      if (!a.isSuperadmin && b.isSuperadmin) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ organizations: mappedOrganizations });
  } catch (error) {
    console.error("Error in GET /api/superadmin/organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
