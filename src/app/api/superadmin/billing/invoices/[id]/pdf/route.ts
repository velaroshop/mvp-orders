import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperadmin } from "@/lib/billing-server";
import { getInvoicePdf, SmartbillError } from "@/lib/smartbill";

export const dynamic = "force-dynamic";

/**
 * GET /api/superadmin/billing/invoices/[id]/pdf - PDF of an invoice issued in SmartBill (superadmin only)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { data: invoice } = await supabaseAdmin
      .from("billing_invoices")
      .select("source, series, number")
      .eq("id", id)
      .single();
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.source !== "smartbill" || !invoice.series || !invoice.number) {
      return NextResponse.json({ error: "Factura nu este emisă în SmartBill." }, { status: 400 });
    }

    const pdf = await getInvoicePdf(invoice.series, invoice.number);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.series}${invoice.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof SmartbillError ? error.message : "Nu s-a putut descărca PDF-ul.";
    console.error("Error in GET /api/superadmin/billing/invoices/[id]/pdf:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
