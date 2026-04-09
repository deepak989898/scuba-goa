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
  date: string;
  people: number;
  /** Amount actually paid (INR) */
  amountPaidInr: number;
  /** Full booking total (INR) */
  fullAmountInr: number;
  balanceInr: number;
  paymentId: string;
  orderId: string;
  isPartial: boolean;
};

let logoBytesCache: Uint8Array | null | undefined;
let qrBytesCache: Uint8Array | null | undefined;

async function tryLoadLogoBytes(): Promise<Uint8Array | null> {
  if (logoBytesCache !== undefined) return logoBytesCache;
  try {
    const p = path.join(process.cwd(), "public", "book-scuba-goa-logo.png");
    const buf = await readFile(p);
    logoBytesCache = new Uint8Array(buf);
    return logoBytesCache;
  } catch {
    logoBytesCache = null;
    return null;
  }
}

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

export async function generateBillPdf(input: BillPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  const dark = rgb(0.03, 0.22, 0.38);
  const dark2 = rgb(0.04, 0.30, 0.49);
  const accent = rgb(0.01, 0.52, 0.78);
  const text = rgb(0.12, 0.18, 0.24);
  const muted = rgb(0.39, 0.45, 0.51);
  const white = rgb(1, 1, 1);

  // Background and header bands
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.97, 0.99, 1) });
  page.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: dark });
  page.drawRectangle({ x: 0, y: height - 123, width, height: 5, color: accent });

  // Subtle low-opacity watermark logo in center area
  const logoBytes = await tryLoadLogoBytes();
  if (logoBytes) {
    try {
      const logoImg = await doc.embedPng(logoBytes);
      const maxW = 250;
      const scale = maxW / logoImg.width;
      const w = logoImg.width * scale;
      const h = logoImg.height * scale;
      page.drawImage(logoImg, {
        x: (width - w) / 2,
        y: (height - h) / 2 - 20,
        width: w,
        height: h,
        opacity: 0.07,
      });
    } catch {
      // Keep generating bill even if logo embedding fails.
    }
  }

  // Brand header
  page.drawText(pdfSafeText(SITE_NAME, 100), {
    x: margin,
    y: height - 55,
    size: 20,
    font: fontBold,
    color: white,
  });
  page.drawText("PAYMENT RECEIPT / BILL", {
    x: margin,
    y: height - 77,
    size: 9.5,
    font,
    color: rgb(0.80, 0.92, 1),
  });
  page.drawText(
    pdfSafeText(
      `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      120
    ),
    {
      x: margin,
      y: height - 92,
      size: 8.5,
      font,
      color: rgb(0.76, 0.88, 0.98),
    }
  );

  // Right-side payment status badge
  const badgeW = 120;
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

  // Decorative diagonal payment stamp for stronger brand confidence.
  if (input.amountPaidInr > 0) {
    const paidStampText = input.isPartial ? "PARTIALLY PAID" : "PAID";
    const stampColor = input.isPartial ? rgb(0.88, 0.55, 0.1) : rgb(0.03, 0.60, 0.30);
    page.drawText(paidStampText, {
      x: width - 205,
      y: height - 265,
      size: input.isPartial ? 28 : 34,
      font: fontBold,
      color: stampColor,
      rotate: degrees(-24),
      opacity: 0.2,
    });
  }

  // Customer detail card
  const cardX = margin;
  let y = height - 154;
  const cardW = width - margin * 2;
  page.drawRectangle({
    x: cardX,
    y: y - 121,
    width: cardW,
    height: 121,
    color: white,
    borderColor: rgb(0.82, 0.89, 0.95),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: cardX,
    y: y - 24,
    width: cardW,
    height: 24,
    color: dark2,
  });
  page.drawText("Guest & Trip Details", {
    x: cardX + 10,
    y: y - 16,
    size: 10,
    font: fontBold,
    color: white,
  });

  const leftColX = cardX + 12;
  const rightColX = cardX + cardW / 2 + 4;
  const labelSize = 8;
  const valueSize = 10;
  let ly = y - 42;
  let ry = y - 42;

  const drawField = (lx: number, yy: number, label: string, value: string) => {
    page.drawText(pdfSafeText(label, 80), {
      x: lx,
      y: yy + 10,
      size: labelSize,
      font: fontBold,
      color: muted,
    });
    page.drawText(pdfSafeText(value, 120), {
      x: lx,
      y: yy,
      size: valueSize,
      font,
      color: text,
      maxWidth: cardW / 2 - 18,
    });
  };

  drawField(leftColX, ly, "Customer", input.customerName);
  ly -= 28;
  drawField(leftColX, ly, "Email", input.customerEmail);
  ly -= 28;
  drawField(leftColX, ly, "Phone", input.phone);

  drawField(rightColX, ry, "Activity / Package", input.packageName);
  ry -= 28;
  drawField(rightColX, ry, "Trip Date", input.date);
  ry -= 28;
  drawField(rightColX, ry, "Guests", String(input.people));

  // Amount summary card
  y -= 142;
  page.drawRectangle({
    x: cardX,
    y: y - 116,
    width: cardW,
    height: 116,
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
  page.drawText("Payment Summary", {
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
    page.drawText(pdfSafeText(label, 90), {
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

  let rowY = y - 40;
  row("Full order value", `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`, rowY);
  rowY -= 22;
  row(
    "Amount paid (this transaction)",
    `Rs.${input.amountPaidInr.toLocaleString("en-IN")}`,
    rowY,
    { strong: true, highlight: true }
  );
  rowY -= 22;
  if (input.isPartial && input.balanceInr > 0) {
    row("Balance due", `Rs.${input.balanceInr.toLocaleString("en-IN")}`, rowY, {
      strong: true,
    });
    rowY -= 22;
  }

  // Transaction metadata + footer
  y -= 130;
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

  // Footer QR watermark (scan to return to website).
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
      // ignore QR rendering failures
    }
  }

  page.drawLine({
    start: { x: margin, y: 54 },
    end: { x: width - margin, y: 54 },
    thickness: 1,
    color: rgb(0.85, 0.90, 0.95),
  });
  page.drawText(pdfSafeText(SITE_URL, 200), {
    x: margin,
    y: 40,
    size: 8.5,
    font,
    color: muted,
  });
  page.drawText("Thank you for choosing Book Scuba Goa", {
    x: width - margin - fontBold.widthOfTextAtSize("Thank you for choosing Book Scuba Goa", 8.5),
    y: 40,
    size: 8.5,
    font: fontBold,
    color: dark2,
  });

  return doc.save();
}
