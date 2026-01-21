import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasRoutePermission } from "./lib/permissions";
import type { UserRole } from "./lib/types";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Check if user has access to an organization
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!token?.organizations || token.organizations.length === 0) {
        return NextResponse.redirect(new URL("/auth/no-organization", req.url));
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
