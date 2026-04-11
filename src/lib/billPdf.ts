import path from "path";
import { readFile } from "fs/promises";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

/** Standard 14 fonts use WinAnsi; unsupported chars make pdf-lib throw. */
function pdfSafeText(s: string, maxLen = 600): string {
  const slice = s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
  let out = "";
  for (const ch of slice) {
    const c = ch.codePointAt(0)!;
    if (c === 9 || c === 10 || c === 13) {
      out += " ";
      continue;
    }
    // Printable ASCII only — safest for Helvetica WinAnsi in pdf-lib
    if (c >= 0x20 && c <= 0x7e) {
      out += ch;
      continue;
    }
    out += "?";
  }
  return out.replace(/\s+/g, " ").trim();
}

export type BillPdfInput = {
  customerName: string;
  customerEmail: string;
  phone: string;
  packageName: string;
  /** Optional breakdown (e.g. cart lines). If omitted, packageName + people are used. */
  packageLines?: string[];
  date: string;
  people: number;
  /** Pickup / meeting point from checkout */
  pickupLocation?: string;
  /** Amount actually paid (INR) */
  amountPaidInr: number;
  /** Full booking total (INR) */
  fullAmountInr: number;
  balanceInr: number;
  paymentId: string;
  orderId: string;
  isPartial: boolean;
};

const pngCache: Record<string, Uint8Array | null | undefined> = {};

async function loadPublicPng(...filenames: string[]): Promise<Uint8Array | null> {
  for (const name of filenames) {
    if (pngCache[name] !== undefined) {
      if (pngCache[name]) return pngCache[name]!;
      continue;
    }
    try {
      const p = path.join(process.cwd(), "public", name);
      const buf = await readFile(p);
      pngCache[name] = new Uint8Array(buf);
      return pngCache[name]!;
    } catch {
      pngCache[name] = null;
    }
  }
  return null;
}

async function tryLoadLogoBytes(): Promise<Uint8Array | null> {
  return loadPublicPng("book-scuba-goa-logo.png");
}

async function tryLoadHeaderLogoBytes(): Promise<Uint8Array | null> {
  const t = await loadPublicPng(
    "book-scuba-goa-logo-transparent.png",
    "book-scuba-goa-logo.png"
  );
  return t;
}

let qrBytesCache: Uint8Array | null | undefined;

async function tryLoadQrBytes(): Promise<Uint8Array | null> {
  if (qrBytesCache !== undefined) return qrBytesCache;
  try {
    const dataUrl = await QRCode.toDataURL(SITE_URL, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 512,
      color: {
        dark: "#0A365F",
        light: "#0000",
      },
    });
    const b64 = dataUrl.split(",")[1] ?? "";
    if (!b64) {
      qrBytesCache = null;
      return null;
    }
    qrBytesCache = Uint8Array.from(Buffer.from(b64, "base64"));
    return qrBytesCache;
  } catch {
    qrBytesCache = null;
    return null;
  }
}

const BILL_NOTES = [
  "Do: bring a valid photo ID for each guest on activity day.",
  "Do: arrive 15 minutes early at the pickup / meeting point unless told otherwise.",
  "Do: keep this receipt and quote your Razorpay payment ID for support.",
  "Don't: drink alcohol before diving or water activities (safety rules apply).",
  "Don't: ignore instructions from guides; follow the briefing on site.",
];

export async function generateBillPdf(input: BillPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 42;
  const dark = rgb(0.03, 0.22, 0.38);
  const dark2 = rgb(0.04, 0.3, 0.49);
  const accent = rgb(0.01, 0.52, 0.78);
  const text = rgb(0.12, 0.18, 0.24);
  const muted = rgb(0.39, 0.45, 0.51);
  const white = rgb(1, 1, 1);

  const rawLines =
    input.packageLines && input.packageLines.length > 0
      ? input.packageLines.map((l) => pdfSafeText(l, 180))
      : [
          pdfSafeText(input.packageName, 120),
          `Total persons / units: ${input.people}`,
        ];
  const maxPkgLines = 9;
  const packageLines =
    rawLines.length > maxPkgLines
      ? [
          ...rawLines.slice(0, maxPkgLines),
          pdfSafeText(
            `+ ${rawLines.length - maxPkgLines} more item(s) — see your email confirmation for the full list.`,
            200
          ),
        ]
      : rawLines;

  const pickupDisplay = input.pickupLocation?.trim()
    ? pdfSafeText(input.pickupLocation.trim(), 220)
    : "Not on file — we will confirm pickup by phone / email if needed.";

  // Background and header bands
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.97, 0.99, 1) });
  page.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: dark });
  page.drawRectangle({ x: 0, y: height - 123, width, height: 5, color: accent });

  // Visible logo on header (brand)
  let headerTextX = margin;
  const headerLogoBytes = await tryLoadHeaderLogoBytes();
  if (headerLogoBytes) {
    try {
      const headerImg = await doc.embedPng(headerLogoBytes);
      const logoH = 48;
      const scale = logoH / headerImg.height;
      const logoW = headerImg.width * scale;
      page.drawImage(headerImg, {
        x: margin,
        y: height - 58 - logoH,
        width: logoW,
        height: logoH,
        opacity: 0.98,
      });
      headerTextX = margin + logoW + 14;
    } catch {
      /* fall back to text-only header */
    }
  }

  // Subtle watermark logo (centre)
  const logoBytes = await tryLoadLogoBytes();
  if (logoBytes) {
    try {
      const logoImg = await doc.embedPng(logoBytes);
      const maxW = 280;
      const scale = maxW / logoImg.width;
      const w = logoImg.width * scale;
      const h = logoImg.height * scale;
      page.drawImage(logoImg, {
        x: (width - w) / 2,
        y: (height - h) / 2 - 24,
        width: w,
        height: h,
        opacity: 0.06,
      });
    } catch {
      /* keep PDF */
    }
  }

  page.drawText(pdfSafeText(SITE_NAME, 100), {
    x: headerTextX,
    y: height - 52,
    size: 19,
    font: fontBold,
    color: white,
  });
  page.drawText("PAYMENT RECEIPT / BILL", {
    x: headerTextX,
    y: height - 74,
    size: 9.5,
    font,
    color: rgb(0.8, 0.92, 1),
  });
  page.drawText(
    pdfSafeText(
      `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      120
    ),
    {
      x: headerTextX,
      y: height - 89,
      size: 8.5,
      font,
      color: rgb(0.76, 0.88, 0.98),
    }
  );

  const badgeW = 128;
  const badgeH = 26;
  const badgeX = width - margin - badgeW;
  const badgeY = height - 74;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: input.isPartial ? rgb(0.93, 0.64, 0.12) : rgb(0.07, 0.65, 0.47),
    borderColor: rgb(1, 1, 1),
    borderWidth: 0.8,
    opacity: 0.94,
  });
  page.drawText(input.isPartial ? "PARTIAL PAYMENT" : "PAID IN FULL", {
    x: badgeX + 12,
    y: badgeY + 8.5,
    size: 9,
    font: fontBold,
    color: white,
  });

  if (input.amountPaidInr > 0) {
    const paidStampText = input.isPartial ? "PARTIALLY PAID" : "PAID";
    const stampColor = input.isPartial ? rgb(0.88, 0.55, 0.1) : rgb(0.03, 0.6, 0.3);
    page.drawText(paidStampText, {
      x: width - 220,
      y: height - 360,
      size: input.isPartial ? 30 : 36,
      font: fontBold,
      color: stampColor,
      rotate: degrees(-24),
      opacity: 0.18,
    });
  }

  const cardX = margin;
  const cardW = width - margin * 2;
  const labelSize = 8;
  const valueSize = 10;

  let cursorFromTop = 132;
  const guestCardH = 148;
  const guestTop = height - cursorFromTop;
  const guestBottom = guestTop - guestCardH;

  page.drawRectangle({
    x: cardX,
    y: guestBottom,
    width: cardW,
    height: guestCardH,
    color: white,
    borderColor: rgb(0.82, 0.89, 0.95),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: cardX,
    y: guestTop - 24,
    width: cardW,
    height: 24,
    color: dark2,
  });
  page.drawText("Customer & contact", {
    x: cardX + 10,
    y: guestTop - 16,
    size: 10,
    font: fontBold,
    color: white,
  });

  let ly = guestTop - 40;
  page.drawText("Customer name", {
    x: cardX + 12,
    y: ly + 12,
    size: labelSize,
    font: fontBold,
    color: muted,
  });
  page.drawText(pdfSafeText(input.customerName, 100), {
    x: cardX + 12,
    y: ly,
    size: 13,
    font: fontBold,
    color: text,
    maxWidth: cardW - 24,
  });
  ly -= 36;

  const mid = cardX + cardW / 2;
  page.drawText("Email", {
    x: cardX + 12,
    y: ly + 10,
    size: labelSize,
    font: fontBold,
    color: muted,
  });
  page.drawText(pdfSafeText(input.customerEmail, 90), {
    x: cardX + 12,
    y: ly,
    size: valueSize,
    font,
    color: text,
    maxWidth: cardW / 2 - 20,
  });
  page.drawText("Phone", {
    x: mid + 4,
    y: ly + 10,
    size: labelSize,
    font: fontBold,
    color: muted,
  });
  page.drawText(pdfSafeText(input.phone, 90), {
    x: mid + 4,
    y: ly,
    size: valueSize,
    font,
    color: text,
    maxWidth: cardW / 2 - 20,
  });
  ly -= 32;

  page.drawText("Pickup / meeting point (as you entered)", {
    x: cardX + 12,
    y: ly + 10,
    size: labelSize,
    font: fontBold,
    color: muted,
  });
  page.drawText(pickupDisplay, {
    x: cardX + 12,
    y: ly,
    size: 9,
    font,
    color: text,
    maxWidth: cardW - 24,
    lineHeight: 11,
  });

  cursorFromTop += guestCardH + 14;

  const pkgLineH = 11;
  const pkgRowStep = 15;
  const pkgBodyH = Math.min(packageLines.length, 14) * pkgRowStep + 22;
  const pkgCardH = 24 + pkgBodyH + 8;
  const pkgTop = height - cursorFromTop;
  const pkgBottom = pkgTop - pkgCardH;

  page.drawRectangle({
    x: cardX,
    y: pkgBottom,
    width: cardW,
    height: pkgCardH,
    color: white,
    borderColor: rgb(0.82, 0.89, 0.95),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: cardX,
    y: pkgTop - 24,
    width: cardW,
    height: 24,
    color: dark2,
  });
  page.drawText("Packages & guests", {
    x: cardX + 10,
    y: pkgTop - 16,
    size: 10,
    font: fontBold,
    color: white,
  });

  let py = pkgTop - 42;
  for (const line of packageLines) {
    page.drawText(line, {
      x: cardX + 12,
      y: py,
      size: 8.8,
      font,
      color: text,
      maxWidth: cardW - 24,
      lineHeight: pkgLineH,
    });
    py -= pkgRowStep;
  }
  page.drawText(
    pdfSafeText(`Trip date: ${input.date || "—"}  |  Headcount (booked): ${input.people}`, 200),
    {
      x: cardX + 12,
      y: pkgBottom + 10,
      size: 8.5,
      font: fontBold,
      color: dark2,
    }
  );

  cursorFromTop += pkgCardH + 14;

  const payCardH = 132;
  let y = height - cursorFromTop;
  page.drawRectangle({
    x: cardX,
    y: y - payCardH,
    width: cardW,
    height: payCardH,
    color: rgb(0.95, 0.98, 1),
    borderColor: rgb(0.78, 0.88, 0.95),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: cardX,
    y: y - 24,
    width: cardW,
    height: 24,
    color: rgb(0.88, 0.95, 1),
  });
  page.drawText("Payment details (INR)", {
    x: cardX + 10,
    y: y - 16,
    size: 10,
    font: fontBold,
    color: dark,
  });

  const row = (
    label: string,
    value: string,
    yy: number,
    opts?: { strong?: boolean; highlight?: boolean }
  ) => {
    if (opts?.highlight) {
      page.drawRectangle({
        x: cardX + 8,
        y: yy - 3,
        width: cardW - 16,
        height: 18,
        color: rgb(0.84, 0.95, 1),
        opacity: 0.72,
      });
    }
    page.drawText(pdfSafeText(label, 100), {
      x: cardX + 12,
      y: yy,
      size: 10,
      font: opts?.strong ? fontBold : font,
      color: text,
    });
    const rendered = pdfSafeText(value, 90);
    const tw = (opts?.strong ? fontBold : font).widthOfTextAtSize(rendered, 10.5);
    page.drawText(rendered, {
      x: cardX + cardW - 12 - tw,
      y: yy,
      size: 10.5,
      font: opts?.strong ? fontBold : font,
      color: opts?.highlight ? dark : text,
    });
  };

  let rowY = y - 42;
  row(
    "Total booking amount (order value)",
    `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`,
    rowY
  );
  rowY -= 22;
  row(
    "Paid now (this transaction)",
    `Rs.${input.amountPaidInr.toLocaleString("en-IN")}`,
    rowY,
    { strong: true, highlight: true }
  );
  rowY -= 22;
  row(
    "Remaining balance (if any)",
    `Rs.${input.balanceInr.toLocaleString("en-IN")}`,
    rowY,
    { strong: true }
  );

  cursorFromTop += payCardH + 10;

  const notesCardH = 22 + BILL_NOTES.length * 11 + 14;
  const notesTop = height - cursorFromTop;
  const notesBottom = notesTop - notesCardH;
  page.drawRectangle({
    x: cardX,
    y: notesBottom,
    width: cardW,
    height: notesCardH,
    color: rgb(0.99, 0.995, 1),
    borderColor: rgb(0.82, 0.89, 0.95),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: cardX,
    y: notesTop - 22,
    width: cardW,
    height: 22,
    color: rgb(0.93, 0.96, 1),
  });
  page.drawText("Please note (do / don't)", {
    x: cardX + 10,
    y: notesTop - 14,
    size: 9,
    font: fontBold,
    color: dark,
  });
  let ny = notesTop - 36;
  for (const note of BILL_NOTES) {
    page.drawText(pdfSafeText(`- ${note}`, 200), {
      x: cardX + 10,
      y: ny,
      size: 7.8,
      font,
      color: text,
      maxWidth: cardW - 20,
      lineHeight: 9,
    });
    ny -= 11;
  }

  cursorFromTop += notesCardH + 8;
  y = height - cursorFromTop;

  page.drawText(pdfSafeText(`Razorpay payment ID: ${input.paymentId}`, 120), {
    x: margin,
    y,
    size: 9,
    font,
    color: muted,
  });
  y -= 14;
  page.drawText(pdfSafeText(`Razorpay order ID: ${input.orderId}`, 120), {
    x: margin,
    y,
    size: 9,
    font,
    color: muted,
  });

  const qrBytes = await tryLoadQrBytes();
  if (qrBytes) {
    try {
      const qr = await doc.embedPng(qrBytes);
      const qrSize = 58;
      const qrX = width - margin - qrSize;
      const qrY = 62;
      page.drawRectangle({
        x: qrX - 4,
        y: qrY - 4,
        width: qrSize + 8,
        height: qrSize + 8,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.82, 0.89, 0.95),
        borderWidth: 0.8,
        opacity: 0.95,
      });
      page.drawImage(qr, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
        opacity: 0.42,
      });
      page.drawText("Scan for website", {
        x: qrX - 6,
        y: qrY - 11,
        size: 7.2,
        font,
        color: muted,
      });
    } catch {
      /* ignore */
    }
  }

  page.drawLine({
    start: { x: margin, y: 54 },
    end: { x: width - margin, y: 54 },
    thickness: 1,
    color: rgb(0.85, 0.9, 0.95),
  });
  page.drawText(pdfSafeText(SITE_URL, 200), {
    x: margin,
    y: 40,
    size: 8.5,
    font,
    color: muted,
  });
  page.drawText("Thank you for choosing Book Scuba Goa", {
    x:
      width -
      margin -
      fontBold.widthOfTextAtSize("Thank you for choosing Book Scuba Goa", 8.5),
    y: 40,
    size: 8.5,
    font: fontBold,
    color: dark2,
  });

  return doc.save();
}
