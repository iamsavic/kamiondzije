import nodemailer from "nodemailer";

// Singleton transporter — reused across requests in the same process
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Email not configured — log and skip silently
    console.warn("[email] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable email notifications.");
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return _transporter;
}

export type MailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(opts: MailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@fleet.local";

  try {
    await transporter.sendMail({
      from: `"Fleet Status" <${from}>`,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
