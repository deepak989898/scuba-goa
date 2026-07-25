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

export type SendMailResult = {
  ok: boolean;
  transport: "resend" | "smtp" | "none";
  error?: string;
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
    return preferSmtpFirst()
      ? "smtp+resend-fallback"
      : smtpFallbackEnabled()
        ? "resend+smtp-fallback"
        : "resend (smtp present, fallback off)";
  }
  if (trimEnv("RESEND_API_KEY")) return "resend";
  if (getSmtpConfig()) return "smtp";
  return "missing MAIL_SMTP_HOST/USER/PASS or RESEND_API_KEY on Vercel";
}

/**
 * Resend is preferred on Vercel (Titan SMTP often times out from serverless).
 * Set MAIL_PREFER_SMTP=1 to force Titan SMTP first.
 */
function preferSmtpFirst(): boolean {
  return trimEnv("MAIL_PREFER_SMTP") === "1";
}

/** SMTP after Resend failure is opt-in — default off so a bad SMTP password cannot hang checkout. */
function smtpFallbackEnabled(): boolean {
  return trimEnv("MAIL_SMTP_FALLBACK") === "1";
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
    (trimEnv("RESEND_API_KEY")
      ? trimEnv("RESEND_FROM_EMAIL") || trimEnv("MAIL_FROM")
      : trimEnv("MAIL_FROM") || trimEnv("RESEND_FROM_EMAIL")) ||
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

async function sendViaSmtp(opts: SendMailOptions): Promise<SendMailResult> {
  const cfg = getSmtpConfig();
  if (!cfg) return { ok: false, transport: "smtp", error: "SMTP not configured" };

  const from = resolveMailFromAddress(opts.from);
  const to = normalizeRecipients(opts.to);
  if (!to.length) {
    return { ok: false, transport: "smtp", error: "no valid To address" };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
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
    return { ok: true, transport: "smtp" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SMTP send failed", {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      from: extractEmailAddress(from),
      to,
      err: message,
    });
    return { ok: false, transport: "smtp", error: message };
  }
}

async function sendViaResend(opts: SendMailOptions): Promise<SendMailResult> {
  const apiKey = trimEnv("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, transport: "resend", error: "RESEND_API_KEY missing" };
  }

  const from = resolveMailFromAddress(
    opts.from || trimEnv("RESEND_FROM_EMAIL") || trimEnv("MAIL_FROM"),
  );
  const to = normalizeRecipients(opts.to);
  if (!to.length) {
    return { ok: false, transport: "resend", error: "no valid To address" };
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
      return {
        ok: false,
        transport: "resend",
        error: `HTTP ${res.status}: ${errText.slice(0, 400)}`,
      };
    }
    return { ok: true, transport: "resend" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Resend send error", { from, to, err: message });
    return { ok: false, transport: "resend", error: message };
  }
}

/**
 * Sends email via Resend (preferred on Vercel) and/or GoDaddy Titan SMTP.
 * When RESEND_API_KEY is set, SMTP is only used as fallback if MAIL_SMTP_FALLBACK=1
 * (avoids long Titan timeouts after a Resend domain/auth failure).
 */
export async function sendMail(opts: SendMailOptions): Promise<boolean> {
  const result = await sendMailDetailed(opts);
  return result.ok;
}

export async function sendMailDetailed(
  opts: SendMailOptions,
): Promise<SendMailResult> {
  const hasSmtp = Boolean(getSmtpConfig());
  const hasResend = Boolean(trimEnv("RESEND_API_KEY"));

  if (!hasSmtp && !hasResend) {
    console.error("sendMail: no mail transport configured", describeMailConfig());
    return {
      ok: false,
      transport: "none",
      error: describeMailConfig(),
    };
  }

  if (preferSmtpFirst() && hasSmtp) {
    const smtp = await sendViaSmtp(opts);
    if (smtp.ok) return smtp;
    if (hasResend) {
      console.warn("SMTP failed — retrying with Resend");
      return sendViaResend(opts);
    }
    return smtp;
  }

  if (hasResend) {
    const resend = await sendViaResend(opts);
    if (resend.ok) return resend;
    if (hasSmtp && smtpFallbackEnabled()) {
      console.warn("Resend failed — retrying with SMTP (MAIL_SMTP_FALLBACK=1)");
      return sendViaSmtp(opts);
    }
    if (hasSmtp && !smtpFallbackEnabled()) {
      console.warn(
        "Resend failed; SMTP fallback skipped (set MAIL_SMTP_FALLBACK=1 to enable). Error:",
        resend.error,
      );
    }
    return resend;
  }

  return sendViaSmtp(opts);
}
