"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Own public pages (/p/...) never use the session: skip the auth providers so visitors
  // don't download that code or trigger a /api/auth/session request. Every other route is unchanged.
  if (pathname?.startsWith("/p/")) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <OrganizationProvider>{children}</OrganizationProvider>
    </SessionProvider>
  );
}
