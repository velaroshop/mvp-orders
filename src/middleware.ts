import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Check if user has access to an organization
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!token?.organizations || token.organizations.length === 0) {
        return NextResponse.redirect(new URL("/auth/no-organization", req.url));
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
