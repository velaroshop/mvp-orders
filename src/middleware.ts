import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasRoutePermission } from "./lib/permissions";
import type { UserRole } from "./lib/types";
import { createClient } from "@supabase/supabase-js";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;

    // Check if user has access to an organization
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!token?.organizations || token.organizations.length === 0) {
        return NextResponse.redirect(new URL("/auth/no-organization", req.url));
      }

      // Check if user is still active in their organization
      if (token.sub && token.activeOrganizationId) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: member } = await supabase
          .from("organization_members")
          .select("is_active")
          .eq("user_id", token.sub)
          .eq("organization_id", token.activeOrganizationId)
          .single();

        if (!member || !member.is_active) {
          const signInUrl = new URL("/auth/signin", req.url);
          signInUrl.searchParams.set("error", "account_disabled");
          const response = NextResponse.redirect(signInUrl);
          // Clear the session cookie to force logout
          response.cookies.delete("next-auth.session-token");
          response.cookies.delete("__Secure-next-auth.session-token");
          return response;
        }
      }

      // Check role-based access
      const userRole = token.activeRole as UserRole;
      const requestedPath = req.nextUrl.pathname;

      if (userRole && !hasRoutePermission(requestedPath, userRole)) {
        // User doesn't have permission - redirect to orders page (accessible to all)
        return NextResponse.redirect(new URL("/admin/orders", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
