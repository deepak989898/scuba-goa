import { SITE_NAME } from "@/lib/constants";
import nodemailer from "nodemailer";

const RESEND_API = "https://api.resend.com/emails";

export type MailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
};

export type SendMailOptions = {
  from?: string;
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
};

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

/** True when Titan SMTP or Resend is configured for outbound mail. */
export function isMailConfigured(): boolean {
  return Boolean(getSmtpConfig() || trimEnv("RESEND_API_KEY"));
}

/** Human-readable reason when outbound mail is not configured (for cron logs). */
export function describeMailConfig(): string {
  if (getSmtpConfig()) return "smtp";
  if (trimEnv("RESEND_API_KEY")) return "resend";
  return "missing MAIL_SMTP_HOST/USER/PASS or RESEND_API_KEY on Vercel";
}

function getSmtpConfig():
  | { host: string; port: number; user: string; pass: string }
  | null {
  const host = trimEnv("MAIL_SMTP_HOST");
  const user = trimEnv("MAIL_SMTP_USER");
  const pass = trimEnv("MAIL_SMTP_PASS");
  if (!host || !user || !pass) return null;

  const portRaw = trimEnv("MAIL_SMTP_PORT");
  const port = portRaw ? Number(portRaw) : 465;
  if (!Number.isFinite(port) || port <= 0) return null;

  return { host, port, user, pass };
}

/** Default From address for booking and report emails. */
export function resolveMailFromAddress(raw?: string): string {
  const trimmed =
    raw?.trim() ||
    trimEnv("MAIL_FROM") ||
    trimEnv("MAIL_SMTP_USER") ||
    trimEnv("RESEND_FROM_EMAIL") ||
    "";
  if (!trimmed) return `${SITE_NAME} <onboarding@resend.dev>`;
  if (trimmed.includes("<") && trimmed.includes(">")) return trimmed;
  if (trimmed.includes("@")) return `${SITE_NAME} <${trimmed}>`;
  return `${SITE_NAME} <onboarding@resend.dev>`;
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match?.[1]?.trim() || from.trim();
}

function normalizeRecipients(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((s) => s.trim()).filter((s) => s.includes("@"));
}

async function sendViaSmtp(opts: SendMailOptions): Promise<boolean> {
  const cfg = getSmtpConfig();
  if (!cfg) return false;

  const from = resolveMailFromAddress(opts.from);
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  try {
    await transporter.sendMail({
      from,
      to: normalizeRecipients(opts.to),
      bcc: normalizeRecipients(opts.bcc),
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content),
      })),
    });
    return true;
  } catch (err) {
    console.error("SMTP send failed", {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      from: extractEmailAddress(from),
      to: opts.to,
      err,
    });
    return false;
  }
}

async function sendViaResend(opts: SendMailOptions): Promise<boolean> {
  const apiKey = trimEnv("RESEND_API_KEY");
  if (!apiKey) return false;

  const from = resolveMailFromAddress(opts.from);
  const body: Record<string, unknown> = {
    from,
    to: normalizeRecipients(opts.to),
    subject: opts.subject,
    html: opts.html,
  };

  const bcc = normalizeRecipients(opts.bcc);
  if (bcc.length) body.bcc = bcc;
  if (opts.text) body.text = opts.text;

  if (opts.attachments?.length) {
    body.attachments = opts.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content).toString("base64"),
    }));
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Resend send failed", {
      status: res.status,
      from,
      to: opts.to,
      body: errText.slice(0, 800),
    });
  }

  return res.ok;
}

/** Sends email via GoDaddy Titan SMTP when configured, otherwise Resend API. */
export async function sendMail(opts: SendMailOptions): Promise<boolean> {
  if (getSmtpConfig()) return sendViaSmtp(opts);
  return sendViaResend(opts);
}
