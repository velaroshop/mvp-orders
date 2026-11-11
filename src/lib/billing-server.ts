import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Owner of a superadmin organization, or an error response to return. */
export async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const user = session.user as any;
  if (user.activeRole !== "owner" || !user.isSuperadminOrg) {
    return {
      error: NextResponse.json({ error: "Access denied. Superadmin privileges required." }, { status: 403 }),
    } as const;
  }
  return { user, activeOrganizationId: user.activeOrganizationId as string } as const;
}

/** True when the billing tables do not exist yet (migration 110 not run). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache/i.test(error.message || "")
  );
}

export { DATE_RE, parseBillingBody, billingEnableError } from "@/lib/billing-validation";
