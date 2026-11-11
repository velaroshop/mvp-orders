import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/billing-server";
import { emailInvoice } from "@/lib/billing-invoices";

/**
 * POST /api/superadmin/billing/invoices/[id]/email - Send (or resend) the invoice email with the PDF attached
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const result = await emailInvoice(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Emailul nu s-a putut trimite." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/superadmin/billing/invoices/[id]/email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
