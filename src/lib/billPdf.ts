import path from "path";
import { readFile } from "fs/promises";
import QRCode from "qrcode";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { SITE_URL } from "@/lib/constants";

function pdfSafeText(s: string, maxLen = 600): string {
  const mapped = s
    .replace(/[₹]/g, "Rs.")
    .replace(/[•·]/g, "*")
    .replace(/[—–−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[…]/g, "...");
  const slice =
    mapped.length > maxLen ? `${mapped.slice(0, maxLen - 3)}...` : mapped;
  let out = "";
  for (const ch of slice) {
    const c = ch.codePointAt(0)!;
    if (c === 9 || c === 10 || c === 13) {
      out += " ";
      continue;
    }
    if (c >= 0x20 && c <= 0x7e) out += ch;
    else out += " ";
  }
  return out.replace(/\s+/g, " ").trim();
}

export type BillPdfInput = {
  customerName: string;
  customerEmail: string;
  phone: string;
  packageName: string;
  packageLines?: string[];
  date: string;
  people: number;
  pickupLocation?: string;
  amountPaidInr: number;
  fullAmountInr: number;
  balanceInr: number;
  paymentId: string;
  orderId: string;
  isPartial: boolean;
};

const C = {
  navy: rgb(0.03, 0.14, 0.32),
  navyText: rgb(0.05, 0.2, 0.42),
  blue: rgb(0.1, 0.48, 0.86),
  blueSoft: rgb(0.93, 0.97, 1),
  green: rgb(0.11, 0.64, 0.36),
  greenBg: rgb(0.9, 0.97, 0.92),
  greenDark: rgb(0.04, 0.52, 0.3),
  orange: rgb(0.95, 0.52, 0.08),
  orangeBg: rgb(1, 0.96, 0.9),
  red: rgb(0.88, 0.22, 0.18),
  text: rgb(0.12, 0.16, 0.22),
  muted: rgb(0.45, 0.5, 0.58),
  white: rgb(1, 1, 1),
  pageBg: rgb(0.97, 0.98, 0.99),
  border: rgb(0.86, 0.9, 0.94),
  pill: rgb(0.88, 0.95, 1),
};

const pngCache: Record<string, Uint8Array | null | undefined> = {};

async function loadPublicBytes(...relativePaths: string[]): Promise<Uint8Array | null> {
  for (const rel of relativePaths) {
    if (pngCache[rel] !== undefined) {
      if (pngCache[rel]) return pngCache[rel]!;
      continue;
    }
    try {
      const p = path.join(process.cwd(), "public", rel);
      pngCache[rel] = new Uint8Array(await readFile(p));
      return pngCache[rel]!;
    } catch {
      pngCache[rel] = null;
    }
  }
  return null;
}

async function embedImage(
  doc: PDFDocument,
  ...relativePaths: string[]
): Promise<PDFImage | null> {
  const bytes = await loadPublicBytes(...relativePaths);
  if (!bytes) return null;
  try {
    return await doc.embedPng(bytes);
  } catch {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

let qrBytesCache: Uint8Array | null | undefined;

async function tryLoadQrBytes(): Promise<Uint8Array | null> {
  if (qrBytesCache !== undefined) return qrBytesCache;
  try {
    const dataUrl = await QRCode.toDataURL(SITE_URL, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
      color: { dark: "#0A2744", light: "#FFFFFF" },
    });
    const b64 = dataUrl.split(",")[1] ?? "";
    qrBytesCache = b64 ? Uint8Array.from(Buffer.from(b64, "base64")) : null;
    return qrBytesCache;
  } catch {
    qrBytesCache = null;
    return null;
  }
}

function formatOrderRef(orderId: string): string {
  const digits = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-7);
  return `#BSG-${digits.padStart(7, "0")}`;
}

function parsePackageLine(line: string): { label: string; price: string | null } {
  const priceMatch = line.match(/Rs\.[\d,]+(?:\s*\(line total\))?/);
  if (!priceMatch) return { label: line, price: null };
  const label = line
    .slice(0, line.indexOf(priceMatch[0]))
    .replace(/[\s—\-|]+$/g, "")
    .trim();
  return { label, price: priceMatch[0].replace(/\s*\(line total\)/, "") };
}

const DO_NOTES = [
  "Bring a valid photo ID for each guest on activity day.",
  "Arrive 15 minutes early at the pickup / meeting point.",
  "Keep this receipt and quote your payment reference.",
];

const DONT_NOTES = [
  "Don't drink alcohol before diving or water activities.",
  "Don't ignore guide instructions; follow the briefing.",
  "Don't share payment IDs publicly or with strangers.",
];

function drawCard(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: C.white,
    borderColor: C.border,
    borderWidth: 0.8,
  });
}

function drawSectionTitle(
  page: PDFPage,
  x: number,
  y: number,
  title: string,
  icon: PDFImage | null,
  fontBold: PDFFont,
) {
  if (icon) page.drawImage(icon, { x, y, width: 13, height: 13 });
  page.drawText(title, {
    x: x + (icon ? 17 : 0),
    y: y + 2,
    size: 9.5,
    font: fontBold,
    color: C.navyText,
  });
}

function drawPaymentStatusBox(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  isPartial: boolean,
  orderRef: string,
  paymentId: string,
  font: PDFFont,
  fontBold: PDFFont,
) {
  const accent = isPartial ? C.orange : C.green;
  const bg = isPartial ? C.orangeBg : C.greenBg;
  const status = isPartial ? "ADVANCED PAID" : "FULL PAID";

  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: bg,
    borderColor: accent,
    borderWidth: 0.8,
  });
  page.drawCircle({ x: x + 13, y: y + h - 14, size: 11, color: accent });
  page.drawText("v", {
    x: x + 9.5,
    y: y + h - 17.5,
    size: 7,
    font: fontBold,
    color: C.white,
  });
  page.drawText("Payment Status", {
    x: x + 22,
    y: y + h - 15,
    size: 6.5,
    font,
    color: accent,
  });
  page.drawText(status, {
    x: x + 22,
    y: y + h - 28,
    size: 10,
    font: fontBold,
    color: accent,
  });
  page.drawText(`Order ID: ${orderRef}`, {
    x: x + 8,
    y: y + 16,
    size: 6,
    font,
    color: C.muted,
  });
  page.drawText(`Payment ID: ${pdfSafeText(paymentId, 24)}`, {
    x: x + 8,
    y: y + 7,
    size: 5.5,
    font,
    color: C.muted,
  });
}

/** Green brush-style FULL PAID / ADVANCED PAID stamp (reference design). */
function drawPaidStamp(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  isPartial: boolean,
  font: PDFFont,
  fontBold: PDFFont,
  fontOblique: PDFFont,
) {
  const accent = isPartial ? C.orange : C.green;
  const status = isPartial ? "ADVANCED PAID" : "FULL PAID";

  page.drawText("Book Scuba Goa", {
    x: x + 6,
    y: y + h - 12,
    size: 10,
    font: fontOblique,
    color: C.navyText,
  });

  page.drawRectangle({
    x: x + 2,
    y: y + 10,
    width: w - 4,
    height: 34,
    color: accent,
  });
  page.drawRectangle({
    x: x + 6,
    y: y + 14,
    width: w - 12,
    height: 26,
    color: accent,
    opacity: 0.85,
  });

  page.drawCircle({
    x: x + 26,
    y: y + 27,
    size: 18,
    color: C.white,
  });
  page.drawText("v", {
    x: x + 20.5,
    y: y + 21,
    size: 11,
    font: fontBold,
    color: accent,
  });

  const statusSize = 10;
  const statusW = fontBold.widthOfTextAtSize(status, statusSize);
  page.drawText(status, {
    x: x + (w - statusW) / 2 + 8,
    y: y + 20,
    size: statusSize,
    font: fontBold,
    color: C.white,
  });
}

export async function generateBillPdf(input: BillPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const M = 18;
  const CW = width - M * 2;
  const FOOT_H = 92;
  const GAP = 5;

  const headerArt = await embedImage(doc, "bill/invoice-header.png");
  const footerArt = await embedImage(doc, "bill/invoice-footer.png");
  const pkgThumb = await embedImage(doc, "bill/package-thumb.png");
  const iconPerson = await embedImage(doc, "bill/icon-person.png");
  const iconGift = await embedImage(doc, "bill/icon-gift.png");
  const iconRupee = await embedImage(doc, "bill/icon-rupee.png");
  const iconAlert = await embedImage(doc, "bill/icon-alert.png");
  const iconPin = await embedImage(doc, "bill/icon-pin.png");
  const iconCheck = await embedImage(doc, "bill/icon-check.png");
  const iconX = await embedImage(doc, "bill/icon-x.png");
  const iconShield = await embedImage(doc, "bill/icon-shield.png");
  const iconBadge = await embedImage(doc, "bill/icon-badge.png");
  const iconHeadset = await embedImage(doc, "bill/icon-headset.png");
  const iconStar = await embedImage(doc, "bill/icon-star.png");

  const stampIsPartial =
    input.isPartial ||
    (input.balanceInr > 0 && input.fullAmountInr > input.amountPaidInr);

  const rawLines =
    input.packageLines && input.packageLines.length > 0
      ? input.packageLines.map((l) => pdfSafeText(l, 160))
      : [pdfSafeText(input.packageName, 120)];
  const packageLines = rawLines.slice(0, 4);

  const pickupDisplay = input.pickupLocation?.trim()
    ? pdfSafeText(input.pickupLocation.trim(), 200)
    : "Not on file - we will confirm pickup by phone / email.";

  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const orderRef = formatOrderRef(input.orderId || input.paymentId);
  const siteHost = pdfSafeText(SITE_URL.replace(/^https?:\/\//, ""), 60);

  page.drawRectangle({ x: 0, y: 0, width, height, color: C.pageBg });

  // ── Footer (fixed at bottom) ────────────────────────────────────────────
  if (footerArt) {
    page.drawImage(footerArt, { x: 0, y: 0, width, height: FOOT_H });
  } else {
    page.drawRectangle({ x: 0, y: 0, width, height: FOOT_H, color: C.navy });
  }

  const qrBytes = await tryLoadQrBytes();
  const qrSize = 46;
  const qrX = width * 0.41 - qrSize / 2;
  const qrY = 22;
  page.drawRectangle({
    x: qrX - 3,
    y: qrY - 3,
    width: qrSize + 6,
    height: qrSize + 6,
    color: C.white,
  });
  if (qrBytes) {
    try {
      const qr = await doc.embedPng(qrBytes);
      page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    } catch {
      /* ignore */
    }
  }

  // ── Stack sections bottom-up (just above footer) ────────────────────────
  let y = FOOT_H + GAP;

  const NOTES_H = 72;
  drawCard(page, M, y, CW, NOTES_H);
  drawSectionTitle(
    page,
    M + 8,
    y + NOTES_H - 18,
    "Please note (Do / Don't)",
    iconAlert,
    fontBold,
  );
  const halfW = (CW - 24) / 2;
  const doX = M + 10;
  const dontX = M + 10 + halfW + 4;
  const noteY = y + NOTES_H - 34;
  DO_NOTES.forEach((n, i) => {
    const yy = noteY - i * 14;
    if (iconCheck) page.drawImage(iconCheck, { x: doX, y: yy - 1, width: 9, height: 9 });
    page.drawText(pdfSafeText(n, 72), {
      x: doX + 12,
      y: yy,
      size: 6.5,
      font,
      color: C.text,
      maxWidth: halfW - 16,
    });
  });
  DONT_NOTES.forEach((n, i) => {
    const yy = noteY - i * 14;
    if (iconX) page.drawImage(iconX, { x: dontX, y: yy - 1, width: 9, height: 9 });
    page.drawText(pdfSafeText(n, 72), {
      x: dontX + 12,
      y: yy,
      size: 6.5,
      font,
      color: C.text,
      maxWidth: halfW - 16,
    });
  });
  y += NOTES_H + GAP;

  const PAY_H = 82;
  drawCard(page, M, y, CW, PAY_H);
  drawSectionTitle(
    page,
    M + 8,
    y + PAY_H - 18,
    "Payment details (INR)",
    iconRupee,
    fontBold,
  );

  const stampW = 128;
  const stampH = 54;
  const stampX = M + CW - stampW - 8;
  const stampY = y + 12;
  const payValRight = stampX - 10;

  drawPaidStamp(
    page,
    stampX,
    stampY,
    stampW,
    stampH,
    stampIsPartial,
    font,
    fontBold,
    fontOblique,
  );

  const payRows = [
    {
      label: "Total booking amount (order value)",
      value: `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`,
    },
    {
      label: "Advance payment",
      value: `Rs.${input.amountPaidInr.toLocaleString("en-IN")}`,
      hi: true,
    },
    {
      label: "Remaining balance (if any)",
      value: `Rs.${input.balanceInr.toLocaleString("en-IN")}`,
    },
  ];
  let rowY = y + PAY_H - 32;
  for (const r of payRows) {
    if (r.hi) {
      page.drawRectangle({
        x: M + 6,
        y: rowY - 2,
        width: payValRight - M - 6,
        height: 14,
        color: C.pill,
      });
    }
    page.drawText(r.label, {
      x: M + 10,
      y: rowY,
      size: 7.5,
      font,
      color: C.text,
      maxWidth: payValRight - M - 16,
    });
    const tw = fontBold.widthOfTextAtSize(r.value, 8.5);
    page.drawText(r.value, {
      x: payValRight - tw,
      y: rowY,
      size: 8.5,
      font: fontBold,
      color: r.hi ? C.navyText : C.text,
    });
    rowY -= 16;
  }
  y += PAY_H + GAP;

  const PKG_H = 68;
  drawCard(page, M, y, CW, PKG_H);
  drawSectionTitle(
    page,
    M + 8,
    y + PKG_H - 18,
    "Packages & guests",
    iconGift,
    fontBold,
  );

  const thumbW = 56;
  const thumbH = 40;
  if (pkgThumb) {
    page.drawImage(pkgThumb, {
      x: M + 10,
      y: y + 14,
      width: thumbW,
      height: thumbH,
    });
  } else {
    page.drawRectangle({
      x: M + 10,
      y: y + 14,
      width: thumbW,
      height: thumbH,
      color: C.pill,
    });
  }

  const primaryLine = packageLines[0] ?? pdfSafeText(input.packageName, 120);
  const { label: pkgLabel, price: pkgPrice } = parsePackageLine(primaryLine);
  const displayPrice =
    pkgPrice ?? `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`;
  const pkgTextX = M + 10 + thumbW + 8;

  page.drawText(pkgLabel, {
    x: pkgTextX,
    y: y + PKG_H - 32,
    size: 9,
    font: fontBold,
    color: C.text,
    maxWidth: CW - thumbW - 90,
  });
  page.drawText(
    pdfSafeText(
      `${input.people} person(s)  |  Trip date: ${input.date || "-"}  |  Headcount: ${input.people}`,
      100,
    ),
    {
      x: pkgTextX,
      y: y + PKG_H - 44,
      size: 6.8,
      font,
      color: C.blue,
    },
  );

  const pillW = Math.max(48, fontBold.widthOfTextAtSize(displayPrice, 9) + 14);
  page.drawRectangle({
    x: M + CW - pillW - 10,
    y: y + 22,
    width: pillW,
    height: 20,
    color: C.pill,
    borderColor: rgb(0.78, 0.9, 0.98),
    borderWidth: 0.6,
  });
  page.drawText(displayPrice, {
    x: M + CW - pillW - 4,
    y: y + 28,
    size: 9,
    font: fontBold,
    color: C.greenDark,
  });
  y += PKG_H + GAP;

  const GUEST_H = 94;
  drawCard(page, M, y, CW, GUEST_H);
  drawSectionTitle(
    page,
    M + 8,
    y + GUEST_H - 18,
    "Customer & contact",
    iconPerson,
    fontBold,
  );

  const colW = (CW - 20) / 2;
  const lx = M + 10;
  const rx = M + 10 + colW;

  const leftFields = [
    { label: "Customer Name", value: pdfSafeText(input.customerName, 40) },
    { label: "Email", value: pdfSafeText(input.customerEmail, 42) || "-" },
  ];
  const rightFields = [
    { label: "Phone", value: pdfSafeText(input.phone, 24) },
    { label: "Pickup / Meeting Point", value: pickupDisplay, pin: true },
  ];

  leftFields.forEach((f, i) => {
    const fy = y + GUEST_H - 34 - i * 26;
    page.drawText(f.label, { x: lx, y: fy, size: 6.5, font, color: C.muted });
    page.drawText(f.value, {
      x: lx,
      y: fy - 11,
      size: 8.5,
      font: fontBold,
      color: C.text,
      maxWidth: colW - 6,
    });
  });

  rightFields.forEach((f, i) => {
    const fy = y + GUEST_H - 34 - i * 26;
    const ox = f.pin && iconPin ? 12 : 0;
    if (f.pin && iconPin) {
      page.drawImage(iconPin, { x: rx, y: fy - 12, width: 9, height: 9 });
    }
    page.drawText(f.label, { x: rx + ox, y: fy, size: 6.5, font, color: C.muted });
    page.drawText(f.value, {
      x: rx + ox,
      y: fy - 11,
      size: f.pin ? 7.5 : 8.5,
      font: fontBold,
      color: C.text,
      maxWidth: colW - ox - 4,
    });
  });
  y += GUEST_H + GAP;

  const TRUST_H = 34;
  page.drawRectangle({ x: 0, y, width, height: TRUST_H, color: C.blueSoft });
  page.drawLine({
    start: { x: 0, y },
    end: { x: width, y },
    thickness: 0.5,
    color: C.border,
  });
  const trustItems = [
    { icon: iconShield, title: "Secure Payment", sub: "Processed by Razorpay" },
    { icon: iconBadge, title: "Trusted Operator", sub: "100% Safe & Reliable" },
    { icon: iconHeadset, title: "24/7 Support", sub: "We're here to help" },
    { icon: iconStar, title: "Best Experiences", sub: "Memorable & Hassle-free" },
  ];
  const trustColW = width / 4;
  trustItems.forEach((item, i) => {
    const cx = i * trustColW + 12;
    page.drawCircle({
      x: cx + 6,
      y: y + 20,
      size: 12,
      color: C.blue,
      opacity: 0.15,
    });
    if (item.icon) {
      page.drawImage(item.icon, { x: cx, y: y + 18, width: 11, height: 11 });
    }
    page.drawText(item.title, {
      x: cx + 14,
      y: y + 22,
      size: 6.2,
      font: fontBold,
      color: C.text,
    });
    page.drawText(item.sub, {
      x: cx + 14,
      y: y + 12,
      size: 5.5,
      font,
      color: C.muted,
    });
  });
  y += TRUST_H;

  const TITLE_H = 46;
  page.drawRectangle({ x: 0, y, width, height: TITLE_H, color: C.white });
  page.drawRectangle({
    x: M,
    y: y + 16,
    width: 11,
    height: 13,
    color: C.blue,
  });
  page.drawText("PAYMENT RECEIPT / INVOICE", {
    x: M + 16,
    y: y + 28,
    size: 12,
    font: fontBold,
    color: C.navyText,
  });
  page.drawText("Thank you for choosing Book Scuba Goa", {
    x: M + 16,
    y: y + 16,
    size: 7,
    font,
    color: C.muted,
  });
  page.drawText(`Generated on ${pdfSafeText(generatedAt, 80)}`, {
    x: M + 16,
    y: y + 7,
    size: 6.5,
    font,
    color: C.muted,
  });

  drawPaymentStatusBox(
    page,
    width - M - 142,
    y + 5,
    142,
    38,
    stampIsPartial,
    orderRef,
    input.paymentId,
    font,
    fontBold,
  );
  y += TITLE_H;

  const HERO_H = height - y;
  if (headerArt) {
    page.drawImage(headerArt, { x: 0, y, width, height: HERO_H });
  } else {
    page.drawRectangle({ x: 0, y, width, height: HERO_H, color: C.navy });
  }

  return doc.save();
}
