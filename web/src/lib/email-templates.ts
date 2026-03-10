export type AlertEmailData = {
  title: string;
  message?: string | null;
  level: "warning" | "critical" | "expired";
  entityLabel?: string;
  dashboardUrl: string;
};

const LEVEL_CONFIG = {
  expired: {
    label: "ISTEKLO",
    color: "#7f1d1d",
    bg: "#fef2f2",
    border: "#fca5a5",
    emoji: "🔴",
  },
  critical: {
    label: "KRITIČNO",
    color: "#991b1b",
    bg: "#fff1f1",
    border: "#fca5a5",
    emoji: "🟠",
  },
  warning: {
    label: "UPOZORENJE",
    color: "#92400e",
    bg: "#fffbeb",
    border: "#fcd34d",
    emoji: "🟡",
  },
} as const;

export function buildAlertEmail(data: AlertEmailData): { subject: string; html: string; text: string } {
  const cfg = LEVEL_CONFIG[data.level];
  const appName = process.env.APP_NAME ?? "Fleet Status Manager";
  const year = new Date().getFullYear();

  const subject = `${cfg.emoji} [${cfg.label}] ${data.title}`;

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#18181b;border-radius:12px 12px 0 0;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                🚛 ${appName}
              </p>
              <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">
                Automatsko obaveštenje o roku
              </p>
            </td>
          </tr>

          <!-- Alert card -->
          <tr>
            <td style="background:#fff;padding:32px;">
              <div style="border:1px solid ${cfg.border};border-radius:8px;background:${cfg.bg};padding:20px 24px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;color:${cfg.color};text-transform:uppercase;">
                  ${cfg.emoji} ${cfg.label}
                </p>
                <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#18181b;line-height:1.3;">
                  ${data.title}
                </p>
                ${data.message ? `<p style="margin:0;font-size:14px;color:#52525b;line-height:1.6;">${data.message}</p>` : ""}
              </div>

              ${
                data.entityLabel
                  ? `<p style="margin:0 0 24px;font-size:13px;color:#71717a;">
                  <strong>Entitet:</strong> ${data.entityLabel}
                </p>`
                  : ""
              }

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}"
                       style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
                      Otvori alarm u aplikaciji →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;border-radius:0 0 12px 12px;padding:16px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                Ovo je automatska poruka sistema ${appName}.<br>
                © ${year} Fleet Status. Ne odgovarajte na ovaj email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `[${cfg.label}] ${data.title}
${data.message ?? ""}
${data.entityLabel ? `Entitet: ${data.entityLabel}` : ""}

Otvorite alarm: ${data.dashboardUrl}

---
Automatska poruka sistema ${appName}.`;

  return { subject, html, text };
}

// Digest email - multiple alerts at once
export type DigestAlertItem = {
  level: "warning" | "critical" | "expired";
  title: string;
  message?: string | null;
};

export function buildDigestEmail(
  alerts: DigestAlertItem[],
  dashboardUrl: string
): { subject: string; html: string; text: string } {
  const appName = process.env.APP_NAME ?? "Fleet Status Manager";
  const year = new Date().getFullYear();

  const expired = alerts.filter((a) => a.level === "expired");
  const critical = alerts.filter((a) => a.level === "critical");
  const warning = alerts.filter((a) => a.level === "warning");

  const subject = `🔔 Fleet Status — ${alerts.length} alarm${alerts.length === 1 ? "" : "a"} zahteva pažnju`;

  function renderGroup(items: DigestAlertItem[], cfg: (typeof LEVEL_CONFIG)[keyof typeof LEVEL_CONFIG]) {
    if (!items.length) return "";
    return `
      <p style="margin:20px 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;color:${cfg.color};text-transform:uppercase;">${cfg.emoji} ${cfg.label} (${items.length})</p>
      ${items
        .map(
          (a) => `
        <div style="border-left:3px solid ${cfg.border};padding:8px 12px;margin-bottom:8px;background:${cfg.bg};border-radius:0 6px 6px 0;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#18181b;">${a.title}</p>
          ${a.message ? `<p style="margin:0;font-size:12px;color:#71717a;">${a.message}</p>` : ""}
        </div>`
        )
        .join("")}`;
  }

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <tr>
            <td style="background:#18181b;border-radius:12px 12px 0 0;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">🚛 ${appName}</p>
              <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">
                Dnevni pregled alarma — ${new Date().toLocaleDateString("sr-Latn-RS")}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#fff;padding:32px;">
              <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#18181b;">
                ${alerts.length} alarm${alerts.length === 1 ? "" : "a"} zahteva pažnju
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#71717a;">
                Pregled aktivnih alarma voznog parka
              </p>

              ${renderGroup(expired, LEVEL_CONFIG.expired)}
              ${renderGroup(critical, LEVEL_CONFIG.critical)}
              ${renderGroup(warning, LEVEL_CONFIG.warning)}

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
                      Otvori sve alarme →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                Automatska poruka sistema ${appName}. © ${year}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `Fleet Status — ${alerts.length} alarm(a) zahteva pažnju`,
    `Datum: ${new Date().toLocaleDateString("sr-Latn-RS")}`,
    "",
    ...expired.map((a) => `🔴 [ISTEKLO] ${a.title}${a.message ? " — " + a.message : ""}`),
    ...critical.map((a) => `🟠 [KRITIČNO] ${a.title}${a.message ? " — " + a.message : ""}`),
    ...warning.map((a) => `🟡 [UPOZORENJE] ${a.title}${a.message ? " — " + a.message : ""}`),
    "",
    `Otvorite alarme: ${dashboardUrl}`,
  ];

  return { subject, html, text: textLines.join("\n") };
}
