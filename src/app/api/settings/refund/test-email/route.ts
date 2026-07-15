import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

// POST - Send a test email to verify RESEND configuration
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;

    if (!["owner", "admin"].includes(activeRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load settings
    const { data: rawSettings, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (settingsError) {
      return NextResponse.json({
        success: false,
        step: "load_settings",
        error: `Nu s-au putut incarca setarile: ${settingsError.message}`,
      });
    }

    const settings = rawSettings as any;

    // Check each required field
    const checks = {
      resend_api_key: !!settings?.resend_api_key,
      refund_from_email: settings?.refund_from_email || null,
      refund_from_name: settings?.refund_from_name || null,
      refund_notification_email: settings?.refund_notification_email || null,
      refund_email_client_subject: settings?.refund_email_client_subject || null,
      refund_email_client_body: !!(settings?.refund_email_client_body),
      refund_email_admin_subject: settings?.refund_email_admin_subject || null,
      refund_email_admin_body: !!(settings?.refund_email_admin_body),
    };

    if (!checks.resend_api_key) {
      return NextResponse.json({
        success: false,
        step: "check_api_key",
        error: "Resend API Key nu este salvata in baza de date. Salveaza setarile din nou.",
        checks,
      });
    }

    if (!checks.refund_from_email) {
      return NextResponse.json({
        success: false,
        step: "check_from_email",
        error: "Email expeditor (from) nu este configurat.",
        checks,
      });
    }

    if (!checks.refund_notification_email) {
      return NextResponse.json({
        success: false,
        step: "check_notification_email",
        error: "Email notificare admin nu este configurat.",
        checks,
      });
    }

    // Try to send a test email
    const resend = new Resend(settings.resend_api_key);
    const fromName = settings.refund_from_name || "Test";
    const fromEmail = settings.refund_from_email;
    const toEmail = settings.refund_notification_email;

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject: "Test email - Returnari",
      html: "<p>Acesta este un email de test pentru configurarea returnarilor.</p><p>Daca primesti acest email, configurarea RESEND este corecta.</p>",
    });

    if (emailError) {
      return NextResponse.json({
        success: false,
        step: "send_email",
        error: `Resend a returnat eroare: ${emailError.message}`,
        resend_error: emailError,
        checks,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Email test trimis cu succes catre ${toEmail}`,
      email_id: emailResult?.id,
      checks,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      step: "unexpected",
      error: error instanceof Error ? error.message : "Eroare neasteptata",
    });
  }
}
