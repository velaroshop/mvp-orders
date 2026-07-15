import { Resend } from "resend";

interface RefundEmailData {
  ticket_number: string;
  full_name: string;
  email: string;
  phone: string;
  order_number: string;
  product_name: string;
  motive: string;
  description: string;
  created_at: string;
  from_name: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceVariables(template: string, data: RefundEmailData): string {
  return template
    .replace(/\{\{ticket_number\}\}/g, escapeHtml(data.ticket_number || ""))
    .replace(/\{\{full_name\}\}/g, escapeHtml(data.full_name || ""))
    .replace(/\{\{email\}\}/g, escapeHtml(data.email || ""))
    .replace(/\{\{phone\}\}/g, escapeHtml(data.phone || "-"))
    .replace(/\{\{order_number\}\}/g, escapeHtml(data.order_number || "-"))
    .replace(/\{\{product_name\}\}/g, escapeHtml(data.product_name || ""))
    .replace(/\{\{motive\}\}/g, escapeHtml(data.motive || ""))
    .replace(/\{\{description\}\}/g, escapeHtml(data.description || "-"))
    .replace(/\{\{created_at\}\}/g, escapeHtml(data.created_at || ""))
    .replace(/\{\{from_name\}\}/g, escapeHtml(data.from_name || ""));
}

export async function sendRefundClientEmail(
  resendApiKey: string,
  fromEmail: string,
  fromName: string,
  subjectTemplate: string,
  bodyTemplate: string,
  data: RefundEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(resendApiKey);
    const subject = replaceVariables(subjectTemplate, data);
    const body = replaceVariables(bodyTemplate, data);

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.email,
      subject,
      html: body,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending refund client email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendRefundAdminEmail(
  resendApiKey: string,
  fromEmail: string,
  fromName: string,
  notificationEmail: string,
  subjectTemplate: string,
  bodyTemplate: string,
  data: RefundEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(resendApiKey);
    const subject = replaceVariables(subjectTemplate, data);
    const body = replaceVariables(bodyTemplate, data);

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: notificationEmail,
      subject,
      html: body,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending refund admin email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
