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
