import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Guard = { ok: true; organizationId: string; userId: string | null } | { ok: false; response: NextResponse };

/** Own pages are managed by superadmins only (role owner in the superadmin organization). */
export async function requireSuperadmin(): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const user = session.user as { activeRole?: string; isSuperadminOrg?: boolean; activeOrganizationId?: string; id?: string };
  if (user.activeRole !== "owner" || !user.isSuperadminOrg) {
    return { ok: false, response: NextResponse.json({ error: "Superadmin access required" }, { status: 403 }) };
  }
  if (!user.activeOrganizationId) {
    return { ok: false, response: NextResponse.json({ error: "No active organization" }, { status: 400 }) };
  }
  return { ok: true, organizationId: user.activeOrganizationId, userId: user.id ?? null };
}
