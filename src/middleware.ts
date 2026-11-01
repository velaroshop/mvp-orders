import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { hasRoutePermission } from "./lib/permissions";
import type { UserRole } from "./lib/types";
import { createClient } from "@supabase/supabase-js";

const authMiddleware = withAuth(
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

// ─── Custom domains for own pages ───────────────────────────────────────────────────────────────────────────────
// A request to a hostname that is a verified custom domain (table page_domains) is rewritten to /sites/<host with ~ for dots>/<path>,
// which serves that domain's pages. Any other hostname goes through exactly as before. This runs only for page routes
// (see the matcher): never for /api, /widget, /thank-you, /_next or files, so the order form and its API are untouched.

type DomainInfo = { rootRedirect: string | null } | null;
const domainCache = new Map<string, { value: DomainInfo; expires: number }>();

/** Hostnames of this application itself: never looked up, never rewritten */
function isAppHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app") || host.endsWith(".localhost")) return true;
  for (const value of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      if (value && new URL(value).hostname.toLowerCase() === host) return true;
    } catch {
      // not a URL: ignore
    }
  }
  return false;
}

async function lookupDomain(host: string): Promise<DomainInfo> {
  const cached = domainCache.get(host);
  if (cached && cached.expires > Date.now()) return cached.value;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("page_domains")
    .select("root_redirect")
    .eq("hostname", host)
    .in("status", ["verified", "active"])
    .maybeSingle();
  // On a lookup error nothing is rewritten (and nothing is cached for long): the request continues as usual
  const value: DomainInfo = error || !data ? null : { rootRedirect: data.root_redirect ?? null };
  domainCache.set(host, { value, expires: Date.now() + (error ? 5_000 : value ? 60_000 : 30_000) });
  return value;
}

// Application areas that must never answer on a customer's domain
const BLOCKED_ON_CUSTOM = ["/admin", "/auth", "/p", "/legal", "/page-preview", "/sites", "/dev"];
const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

async function handleCustomHost(req: NextRequest, host: string): Promise<NextResponse | null> {
  const domain = await lookupDomain(host);
  if (!domain) return null;

  const pathname = req.nextUrl.pathname.replace(/\/+$/, "") || "/";
  if (BLOCKED_ON_CUSTOM.some((prefix) => isUnder(pathname, prefix))) return new NextResponse("Not found", { status: 404 });

  if (pathname === "/") {
    if (domain.rootRedirect) return NextResponse.redirect(domain.rootRedirect, 302);
    return new NextResponse("Not found", { status: 404 });
  }

  const url = req.nextUrl.clone();
  // Dots become "~" so the internal path has no file extension (those paths skip this middleware, see the matcher)
  url.pathname = `/sites/${host.replaceAll(".", "~")}${pathname}`;
  return NextResponse.rewrite(url);
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;
  try {
    const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
    if (host && !isAppHost(host)) {
      const handled = await handleCustomHost(req, host);
      if (handled) return handled;
    } else if (isUnder(pathname, "/sites")) {
      // The internal route for custom domains is not meant to be opened directly on the application domain
      return new NextResponse("Not found", { status: 404 });
    }
  } catch (error) {
    console.error("[Middleware] custom domain routing failed:", error);
  }

  if (isUnder(pathname, "/admin")) return authMiddleware(req as NextRequestWithAuth, event);
  return NextResponse.next();
}

export const config = {
  // Page routes only; /api, /widget, /thank-you, /_next and anything with a file extension are not touched
  matcher: ["/((?!(?:api|_next|widget|thank-you)(?:/|$)|favicon\\.ico|.*\\..*).*)"],
};
