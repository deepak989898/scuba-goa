import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/constants";
import {
  describeMailConfig,
  isMailConfigured,
  resolveMailFromAddress,
  sendMail,
} from "@/lib/mail-transport";

export const runtime = "nodejs";

/** POST { to?: string } — send a tiny test email to verify Vercel mail config. */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        transport: describeMailConfig(),
        error:
          "No mail transport on Vercel. Set RESEND_API_KEY (+ RESEND_FROM_EMAIL) or MAIL_SMTP_HOST/USER/PASS.",
      },
      { status: 500 },
    );
  }

  let to = CONTACT_EMAIL;
  try {
    const body = (await req.json()) as { to?: string };
    if (typeof body.to === "string" && body.to.includes("@")) {
      to = body.to.trim();
    }
  } catch {
    /* optional body */
  }

  const from = resolveMailFromAddress();
  const sent = await sendMail({
    from,
    to,
    subject: `${SITE_NAME} — mail test`,
    html: `<p>Mail test OK from Vercel.</p><p>Transport: <code>${describeMailConfig()}</code></p><p>From: <code>${from}</code></p>`,
  });

  return NextResponse.json({
    ok: sent,
    configured: true,
    transport: describeMailConfig(),
    from,
    to,
    error: sent
      ? undefined
      : "Send failed. Check Vercel logs. Prefer RESEND_API_KEY with verified domain bookscubagoa.com.",
  });
}

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return NextResponse.json({
    configured: isMailConfigured(),
    transport: describeMailConfig(),
    from: isMailConfigured() ? resolveMailFromAddress() : null,
  });
}
