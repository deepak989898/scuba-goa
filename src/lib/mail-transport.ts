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
  if (trimEnv("RESEND_API_KEY") && getSmtpConfig()) {
    return preferSmtpFirst() ? "smtp+resend-fallback" : "resend+smtp-fallback";
  }
  if (getSmtpConfig()) return "smtp";
  if (trimEnv("RESEND_API_KEY")) return "resend";
  return "missing MAIL_SMTP_HOST/USER/PASS or RESEND_API_KEY on Vercel";
}

/**
 * Resend is preferred on Vercel (Titan SMTP often times out from serverless).
 * Set MAIL_PREFER_SMTP=1 to force Titan SMTP first.
 */
function preferSmtpFirst(): boolean {
  return trimEnv("MAIL_PREFER_SMTP") === "1";
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
    trimEnv("RESEND_FROM_EMAIL") ||
    trimEnv("MAIL_SMTP_USER") ||
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
  const to = normalizeRecipients(opts.to);
  if (!to.length) {
    console.error("SMTP send skipped: no valid To address");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    await transporter.sendMail({
      from,
      to,
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
      to,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

async function sendViaResend(opts: SendMailOptions): Promise<boolean> {
  const apiKey = trimEnv("RESEND_API_KEY");
  if (!apiKey) return false;

  const from = resolveMailFromAddress(
    opts.from || trimEnv("RESEND_FROM_EMAIL") || trimEnv("MAIL_FROM"),
  );
  const to = normalizeRecipients(opts.to);
  if (!to.length) {
    console.error("Resend send skipped: no valid To address");
    return false;
  }

  const body: Record<string, unknown> = {
    from,
    to,
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

  try {
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
        to,
        body: errText.slice(0, 800),
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send error", {
      from,
      to,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Sends email via Resend (preferred on Vercel) and/or GoDaddy Titan SMTP.
 * If the primary transport fails, automatically tries the other when configured.
 */
export async function sendMail(opts: SendMailOptions): Promise<boolean> {
  const hasSmtp = Boolean(getSmtpConfig());
  const hasResend = Boolean(trimEnv("RESEND_API_KEY"));

  if (!hasSmtp && !hasResend) {
    console.error("sendMail: no mail transport configured", describeMailConfig());
    return false;
  }

  if (preferSmtpFirst() && hasSmtp) {
    if (await sendViaSmtp(opts)) return true;
    if (hasResend) {
      console.warn("SMTP failed — retrying with Resend");
      return sendViaResend(opts);
    }
    return false;
  }

  if (hasResend) {
    if (await sendViaResend(opts)) return true;
    if (hasSmtp) {
      console.warn("Resend failed — retrying with SMTP");
      return sendViaSmtp(opts);
    }
    return false;
  }

  return sendViaSmtp(opts);
}
