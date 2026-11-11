import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export async function sendPasswordResetEmail(email: string, resetUrl: string, name: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-block;background:#4f46e5;border-radius:16px;width:48px;height:48px;line-height:48px;text-align:center;margin-bottom:12px;">
                <span style="color:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;">E</span>
              </div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">EMS</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Ecom Made Simple</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 8px 32px rgba(99,102,241,0.08);padding:40px 36px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Reset your password</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
                Hi ${name}, we received a request to reset the password for your EMS account. Click the button below to choose a new password.
              </p>

              <!-- Button -->
              <div style="text-align:center;margin:28px 0;">
                <a href="${resetUrl}"
                  style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:-0.1px;box-shadow:0 2px 8px rgba(79,70,229,0.25);">
                  Reset password
                </a>
              </div>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />

              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6;">
                This link expires in <strong style="color:#64748b;">1 hour</strong>. If you didn&apos;t request a password reset, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:12px;color:#cbd5e1;">
                Or copy this URL into your browser:<br />
                <span style="color:#4f46e5;word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} EMS &mdash; Ecom Made Simple
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Resetează parola EMS",
    html,
  });
}

function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-block;background:#4f46e5;border-radius:16px;width:48px;height:48px;line-height:48px;text-align:center;margin-bottom:12px;">
                <span style="color:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;">E</span>
              </div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">EMS</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Ecom Made Simple</div>
            </td>
          </tr>
          <tr>
            <td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 8px 32px rgba(99,102,241,0.08);padding:40px 36px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} EMS &mdash; Ecom Made Simple</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(email: string, name: string, organizationName: string) {
  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:56px;height:56px;background:#eef2ff;border-radius:16px;line-height:56px;text-align:center;margin-bottom:16px;">
        <span style="color:#4f46e5;font-size:26px;font-weight:700;font-family:Arial,sans-serif;">&#10003;</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Bine ai venit, ${name}!</h1>
      <p style="margin:0;font-size:14px;color:#64748b;">Contul tău a fost înregistrat cu succes.</p>
    </div>

    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Organizație</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${organizationName}</p>
    </div>

    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
      Înregistrarea ta a fost primită. Un administrator va revizui și activa contul tău în maximum <strong style="color:#0f172a;">24 de ore</strong>.
    </p>

    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">
      Vei primi un email de confirmare imediat ce contul tău este activat și poți începe să îl folosești.
    </p>

    <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
      Dacă ai întrebări, ne poți contacta oricând.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Bine ai venit la EMS — cont înregistrat",
    html,
  });
}

export async function sendAccountActivatedEmail(email: string, name: string, organizationName: string) {
  const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

  const html = emailLayout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:56px;height:56px;background:#ecfdf5;border-radius:16px;line-height:56px;text-align:center;margin-bottom:16px;">
        <span style="color:#16a34a;font-size:26px;font-weight:700;font-family:Arial,sans-serif;">&#10003;</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Contul tău a fost activat!</h1>
      <p style="margin:0;font-size:14px;color:#64748b;">Poți începe să folosești EMS acum.</p>
    </div>

    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Organizație</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${organizationName}</p>
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">
      Salut ${name}, contul tău pentru organizația <strong style="color:#0f172a;">${organizationName}</strong> a fost aprobat și activat. Te poți autentifica acum și să începi să îți gestionezi comenzile.
    </p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:-0.1px;box-shadow:0 2px 8px rgba(79,70,229,0.25);">
        Intră în cont
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
      Dacă butonul nu funcționează, copiază acest link:<br />
      <span style="color:#4f46e5;">${loginUrl}</span>
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Contul tău EMS a fost activat",
    html,
  });
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface InvoiceEmailInput {
  to: string[];
  replyTo: string;
  recipientName: string;
  invoiceNumber: string; // e.g. EMS0005
  planLabel: string; // PRO / ULTRA
  periodStart: string; // dd.mm.yyyy
  periodEnd: string;
  amountText: string; // e.g. "1.000,00 lei"
  dueDate: string; // dd.mm.yyyy
  pdf: Buffer;
}

/** Invoice email with the PDF attached. */
export async function sendInvoiceEmail(input: InvoiceEmailInput): Promise<{ ok: boolean; error?: string }> {
  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Factură pentru abonamentul EMS</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Bună ziua, ${esc(input.recipientName)},</p>

    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
      Vă transmitem factura <strong style="color:#0f172a;">${esc(input.invoiceNumber)}</strong> pentru abonamentul la platforma EMS (plan ${esc(input.planLabel)}),
      pentru perioada ${esc(input.periodStart)} &ndash; ${esc(input.periodEnd)}.
    </p>

    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Sumă de plată</p>
      <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">${esc(input.amountText)}</p>
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Termen de plată</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${esc(input.dueDate)}</p>
    </div>

    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
      Factura în format PDF este atașată acestui email. Datele pentru plată (contul bancar) se găsesc pe factură.
    </p>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Dacă aveți întrebări, puteți răspunde direct la acest email.
    </p>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to: input.to,
    replyTo: input.replyTo,
    subject: `Factura ${input.invoiceNumber} – abonament EMS`,
    html,
    attachments: [{ filename: `${input.invoiceNumber}.pdf`, content: input.pdf }],
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export interface OverdueInvoiceAlertItem {
  organizationName: string;
  invoice: string;
  amountText: string;
  dueDate: string; // dd.mm.yyyy
  daysLate: number;
}

/** Internal email: invoices that went past their due date. */
export async function sendOverdueInvoicesAlert(to: string, items: OverdueInvoiceAlertItem[]): Promise<{ ok: boolean; error?: string }> {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:600;">${esc(i.organizationName)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${esc(i.invoice || "—")}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;white-space:nowrap;">${esc(i.amountText)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#dc2626;white-space:nowrap;">${esc(i.dueDate)} (${i.daysLate} ${i.daysLate === 1 ? "zi" : "zile"})</td>
      </tr>`
    )
    .join("");

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">${items.length === 1 ? "O factură a depășit" : `${items.length} facturi au depășit`} termenul de plată</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Nu s-a blocat niciun acces. Este doar o notificare.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Organizație</td>
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Factură</td>
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Sumă</td>
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Scadență</td>
      </tr>
      ${rows}
    </table>
    <div style="text-align:center;">
      <a href="${process.env.NEXTAUTH_URL}/admin/superadmin/billing"
        style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 32px;border-radius:12px;font-size:15px;font-weight:600;">
        Deschide Billing
      </a>
    </div>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: items.length === 1 ? "Factură restantă — Billing EMS" : `${items.length} facturi restante — Billing EMS`,
    html,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
