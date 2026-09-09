import path from "path";
import { readFile } from "fs/promises";
import {
  PDFDocument,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

/** Standard 14 fonts use WinAnsi; unsupported chars make pdf-lib throw. */
function pdfSafeText(s: string, maxLen = 600): string {
  const mapped = s
    .replace(/[₹]/g, "Rs.")
    .replace(/[•·]/g, "*")
    .replace(/[—–−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[♡♥]/g, "<3")
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
    if (c >= 0x20 && c <= 0x7e) {
      out += ch;
      continue;
    }
    out += " ";
  }
  return out.replace(/\s+/g, " ").trim();
}

export type BillPdfInput = {
  customerName: string;
  customerEmail: string;
  phone: string;
  packageName: string;
  packageLines?: string[];
  /** Package or service image shown in the invoice card. */
  packageImageUrl?: string;
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
  navy: rgb(0.02, 0.12, 0.28),
  navyText: rgb(0.05, 0.18, 0.38),
  blue: rgb(0.08, 0.45, 0.82),
  blueLight: rgb(0.9, 0.95, 0.99),
  green: rgb(0.12, 0.62, 0.38),
  greenLight: rgb(0.9, 0.97, 0.92),
  greenDark: rgb(0.05, 0.52, 0.3),
  orange: rgb(0.95, 0.55, 0.08),
  orangeLight: rgb(1, 0.96, 0.9),
  red: rgb(0.88, 0.22, 0.18),
  text: rgb(0.12, 0.16, 0.22),
  muted: rgb(0.45, 0.5, 0.58),
  white: rgb(1, 1, 1),
  pageBg: rgb(0.96, 0.98, 1),
  cardBorder: rgb(0.86, 0.9, 0.94),
  trustBg: rgb(0.94, 0.97, 1),
  pillBg: rgb(0.88, 0.95, 1),
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
      const buf = await readFile(p);
      pngCache[rel] = new Uint8Array(buf);
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
  return embedImageBytes(doc, bytes);
}

const urlImageCache: Record<string, Uint8Array | null | undefined> = {};

async function loadImageBytesFromUrl(url: string): Promise<Uint8Array | null> {
  const key = url.trim();
  if (!key) return null;
  if (urlImageCache[key] !== undefined) {
    return urlImageCache[key];
  }

  try {
    let bytes: Uint8Array | null = null;
    if (key.startsWith("/") && !key.startsWith("//")) {
      bytes = await loadPublicBytes(key.replace(/^\//, ""));
    } else if (/^https?:\/\//i.test(key)) {
      const res = await fetch(key, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        urlImageCache[key] = null;
        return null;
      }
      bytes = new Uint8Array(await res.arrayBuffer());
    }
    urlImageCache[key] = bytes;
    return bytes;
  } catch {
    urlImageCache[key] = null;
    return null;
  }
}

async function embedImageBytes(
  doc: PDFDocument,
  bytes: Uint8Array,
): Promise<PDFImage | null> {
  try {
    return await doc.embedPng(bytes);
  } catch {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      try {
        const sharp = (await import("sharp")).default;
        const jpeg = await sharp(Buffer.from(bytes)).jpeg({ quality: 85 }).toBuffer();
        return await doc.embedJpg(new Uint8Array(jpeg));
      } catch {
        return null;
      }
    }
  }
}

async function embedImageFromUrl(
  doc: PDFDocument,
  url?: string,
): Promise<PDFImage | null> {
  if (!url?.trim()) return null;
  const bytes = await loadImageBytesFromUrl(url);
  if (!bytes) return null;
  return embedImageBytes(doc, bytes);
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

/** Scale image to cover a rectangle (like CSS object-fit: cover), clipped to bounds. */
function drawImageCover(
  page: PDFPage,
  img: PDFImage,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity = 1,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  page.pushOperators(
    pushGraphicsState(),
    rectangle(x, y, w, h),
    clip(),
    endPath(),
  );
  page.drawImage(img, {
    x: x + (w - iw) / 2,
    y: y + (h - ih) / 2,
    width: iw,
    height: ih,
    opacity,
  });
  page.pushOperators(popGraphicsState());
}

function drawCard(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: C.white,
    borderColor: C.cardBorder,
    borderWidth: 1,
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
  const textX = x + (icon ? 18 : 0);
  const titleSize = 11;
  const titleW = fontBold.widthOfTextAtSize(title, titleSize) + (icon ? 18 : 0) + 8;

  page.drawRectangle({
    x: x - 2,
    y: y - 7,
    width: titleW,
    height: 17,
    color: C.blueLight,
  });
  if (icon) {
    page.drawImage(icon, { x, y: y - 2, width: 14, height: 14 });
  }
  page.drawText(title, {
    x: textX,
    y,
    size: titleSize,
    font: fontBold,
    color: C.blue,
  });
  page.drawLine({
    start: { x: textX, y: y - 4 },
    end: { x: textX + fontBold.widthOfTextAtSize(title, titleSize), y: y - 4 },
    thickness: 0.8,
    color: C.blue,
    opacity: 0.45,
  });
}

function drawCheckmark(
  page: PDFPage,
  cx: number,
  cy: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawLine({
    start: { x: cx - 3.5, y: cy - 0.5 },
    end: { x: cx - 1, y: cy - 3.5 },
    thickness: 1.6,
    color,
  });
  page.drawLine({
    start: { x: cx - 1, y: cy - 3.5 },
    end: { x: cx + 4.5, y: cy + 3.5 },
    thickness: 1.6,
    color,
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
  const bg = isPartial ? C.orangeLight : C.greenLight;
  const status = isPartial ? "ADVANCED PAID" : "FULL PAID";
  const top = y + h;
  const pad = 8;

  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: bg,
    borderColor: accent,
    borderWidth: 0.8,
  });

  const textX = x + 30;
  const row1Y = top - pad - 5;
  const row2Y = top - pad - 19;
  const checkCx = x + 14;
  const checkCy = (row1Y + row2Y) / 2 - 1;
  page.drawCircle({
    x: checkCx,
    y: checkCy,
    size: 12,
    color: accent,
  });
  drawCheckmark(page, checkCx, checkCy, C.white);

  page.drawText("Payment Status", {
    x: textX,
    y: row1Y,
    size: 6.5,
    font,
    color: accent,
  });
  page.drawText(status, {
    x: textX,
    y: row2Y,
    size: 10,
    font: fontBold,
    color: accent,
  });

  const dividerY = top - pad - 25;
  page.drawLine({
    start: { x: x + 8, y: dividerY },
    end: { x: x + w - 8, y: dividerY },
    thickness: 0.4,
    color: accent,
    opacity: 0.35,
  });

  page.drawText(`Order ID: ${orderRef}`, {
    x: x + 10,
    y: top - pad - 36,
    size: 6.5,
    font,
    color: C.muted,
  });

  const payIdShort = pdfSafeText(paymentId, 22);
  page.drawText(`Payment ID: ${payIdShort}`, {
    x: x + 10,
    y: top - pad - 46,
    size: 5.8,
    font,
    color: C.muted,
    maxWidth: w - 18,
  });
}

export async function generateBillPdf(input: BillPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 22;
  const contentW = width - margin * 2;

  const headerArt = await embedImage(doc, "bill/invoice-header.png");
  const footerArt = await embedImage(doc, "bill/invoice-footer.png");
  const pkgThumb =
    (input.packageImageUrl
      ? await embedImageFromUrl(doc, input.packageImageUrl)
      : null) ?? (await embedImage(doc, "bill/package-van.png"));
  const stampIsPartial =
    input.isPartial ||
    (input.balanceInr > 0 && input.fullAmountInr > input.amountPaidInr);
  const stampArt = await embedImage(
    doc,
    stampIsPartial ? "bill/stamp-advanced-paid.png" : "bill/stamp-full-paid.png",
  );
  const iconPerson = await embedImage(doc, "bill/icon-person.png");
  const iconGift = await embedImage(doc, "bill/icon-gift.png");
  const iconAlert = await embedImage(doc, "bill/icon-alert.png");
  const iconPin = await embedImage(doc, "bill/icon-pin.png");
  const iconCheck = await embedImage(doc, "bill/icon-check.png");
  const iconX = await embedImage(doc, "bill/icon-x.png");
  const iconShield = await embedImage(doc, "bill/icon-shield.png");
  const iconBadge = await embedImage(doc, "bill/icon-badge.png");
  const iconHeadset = await embedImage(doc, "bill/icon-headset.png");
  const iconStar = await embedImage(doc, "bill/icon-star.png");

  const rawLines =
    input.packageLines && input.packageLines.length > 0
      ? input.packageLines.map((l) => pdfSafeText(l, 160))
      : [pdfSafeText(input.packageName, 120)];
  const packageLines =
    rawLines.length > 4
      ? [...rawLines.slice(0, 4), pdfSafeText(`+ ${rawLines.length - 4} more`, 40)]
      : rawLines;

  const pickupDisplay = input.pickupLocation?.trim()
    ? pdfSafeText(input.pickupLocation.trim(), 200)
    : "Not on file - we will confirm pickup by phone / email.";

  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const orderRef = formatOrderRef(input.orderId || input.paymentId);
  page.drawRectangle({ x: 0, y: 0, width, height, color: C.pageBg });

  // ── Header banner (full-width image, no crop or overlay) ──────────────
  const heroH = headerArt
    ? width * (headerArt.height / headerArt.width)
    : 100;
  const heroY = height - heroH;
  if (headerArt) {
    page.drawImage(headerArt, { x: 0, y: heroY, width, height: heroH });
  } else {
    page.drawRectangle({
      x: 0,
      y: heroY,
      width,
      height: heroH,
      color: C.navy,
    });
  }

  // ── Trust bar (directly below header, above receipt title) ──────────────
  const trustH = 40;
  const trustY = heroY - trustH;
  page.drawRectangle({ x: 0, y: trustY, width, height: trustH, color: C.trustBg });
  page.drawLine({
    start: { x: 0, y: trustY + trustH },
    end: { x: width, y: trustY + trustH },
    thickness: 0.5,
    color: C.cardBorder,
  });

  const trustItems = [
    { icon: iconShield, title: "Secure Payment", sub: "Processed by Razorpay" },
    { icon: iconBadge, title: "Trusted Operator", sub: "100% Safe & Reliable" },
    { icon: iconHeadset, title: "24/7 Support", sub: "We're here to help" },
    { icon: iconStar, title: "Best Experiences", sub: "Memorable & Hassle-free" },
  ];
  const trustColW = width / 4;
  trustItems.forEach((item, i) => {
    const cx = i * trustColW + 16;
    if (item.icon) {
      page.drawImage(item.icon, { x: cx, y: trustY + 22, width: 12, height: 12 });
    }
    page.drawText(item.title, {
      x: cx + 15,
      y: trustY + 26,
      size: 6.5,
      font: fontBold,
      color: C.text,
    });
    page.drawText(item.sub, {
      x: cx + 15,
      y: trustY + 15,
      size: 5.8,
      font,
      color: C.muted,
    });
  });

  // ── Title strip + payment status (below trust bar) ────────────────────
  const titleH = 68;
  const titleY = trustY - titleH;
  page.drawRectangle({
    x: 0,
    y: titleY,
    width,
    height: titleH,
    color: C.white,
  });
  page.drawLine({
    start: { x: 0, y: titleY },
    end: { x: width, y: titleY },
    thickness: 0.5,
    color: C.cardBorder,
  });
  page.drawLine({
    start: { x: 0, y: titleY + titleH },
    end: { x: width, y: titleY + titleH },
    thickness: 0.5,
    color: C.cardBorder,
  });

  page.drawText("PAYMENT RECEIPT / INVOICE", {
    x: margin,
    y: titleY + 36,
    size: 12.5,
    font: fontBold,
    color: C.navyText,
  });
  page.drawText("Thank you for choosing Book Scuba Goa", {
    x: margin,
    y: titleY + 22,
    size: 7.5,
    font,
    color: C.muted,
  });
  page.drawText(`Generated on ${pdfSafeText(generatedAt, 80)}`, {
    x: margin,
    y: titleY + 10,
    size: 6.5,
    font,
    color: C.muted,
  });

  const statusBoxW = 162;
  const statusBoxH = 58;
  drawPaymentStatusBox(
    page,
    width - margin - statusBoxW,
    titleY + 5,
    statusBoxW,
    statusBoxH,
    stampIsPartial,
    orderRef,
    input.paymentId,
    font,
    fontBold,
  );

  let yTop = titleY - 8;

  // ── Customer & contact ──────────────────────────────────────────────────
  const guestH = 100;
  const guestBottom = yTop - guestH;
  drawCard(page, margin, guestBottom, contentW, guestH);
  drawSectionTitle(
    page,
    margin + 10,
    yTop - 14,
    "Customer & contact",
    iconPerson,
    fontBold,
  );

  const colW = (contentW - 28) / 2;
  const leftX = margin + 12;
  const rightX = margin + 12 + colW + 4;

  const leftFields = [
    { label: "Customer Name", value: pdfSafeText(input.customerName, 40) },
    { label: "Email", value: pdfSafeText(input.customerEmail, 42) || "-" },
  ];
  const rightFields = [
    { label: "Phone", value: pdfSafeText(input.phone, 24) },
    { label: "Pickup / Meeting Point", value: pickupDisplay },
  ];

  leftFields.forEach((f, i) => {
    const fy = yTop - 36 - i * 28;
    page.drawText(f.label, { x: leftX, y: fy, size: 7, font, color: C.muted });
    page.drawText(f.value, {
      x: leftX,
      y: fy - 12,
      size: 9,
      font: fontBold,
      color: C.text,
      maxWidth: colW - 4,
    });
  });

  rightFields.forEach((f, i) => {
    const fy = yTop - 36 - i * 28;
    if (i === 1 && iconPin) {
      page.drawImage(iconPin, { x: rightX, y: fy - 14, width: 10, height: 10 });
    }
    page.drawText(f.label, {
      x: rightX + (i === 1 ? 13 : 0),
      y: fy,
      size: 7,
      font,
      color: C.muted,
    });
    page.drawText(f.value, {
      x: rightX + (i === 1 ? 13 : 0),
      y: fy - 12,
      size: i === 1 ? 8 : 9,
      font: fontBold,
      color: C.text,
      maxWidth: colW - 16,
    });
  });

  yTop = guestBottom - 8;

  // ── Packages & guests + payment summary (single merged card) ────────────
  const pkgSectionH = 68;
  const paySectionH = 62;
  const combinedH = pkgSectionH + paySectionH;
  const combinedBottom = yTop - combinedH;
  drawCard(page, margin, combinedBottom, contentW, combinedH);

  drawSectionTitle(
    page,
    margin + 10,
    yTop - 14,
    "Packages & guests",
    iconGift,
    fontBold,
  );

  const thumbSize = 48;
  const thumbY = yTop - pkgSectionH + 10;
  if (pkgThumb) {
    page.drawImage(pkgThumb, {
      x: margin + 12,
      y: thumbY,
      width: thumbSize,
      height: thumbSize,
    });
  } else {
    page.drawRectangle({
      x: margin + 12,
      y: thumbY,
      width: thumbSize,
      height: thumbSize,
      color: C.pillBg,
      borderColor: C.cardBorder,
      borderWidth: 0.5,
    });
  }

  const pkgTextX = margin + 12 + thumbSize + 10;
  const primaryLine = packageLines[0] ?? pdfSafeText(input.packageName, 120);
  const { label: pkgLabel, price: pkgPrice } = parsePackageLine(primaryLine);
  const displayPrice =
    pkgPrice ?? `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`;

  const membersColX = margin + contentW * 0.48;
  const stampW = 118;
  const stampH = 58;
  const stampX = margin + contentW - stampW - 10;
  const payValueRight = stampX - 14;

  page.drawText(pkgLabel, {
    x: pkgTextX,
    y: yTop - 36,
    size: 10,
    font: fontBold,
    color: C.text,
    maxWidth: membersColX - pkgTextX - 8,
  });
  page.drawText(`Trip date: ${pdfSafeText(input.date || "-", 24)}`, {
    x: pkgTextX,
    y: yTop - 50,
    size: 7.5,
    font,
    color: C.blue,
  });

  page.drawText("Members", {
    x: membersColX,
    y: yTop - 36,
    size: 7,
    font,
    color: C.muted,
  });
  page.drawText(`${input.people} person(s)`, {
    x: membersColX,
    y: yTop - 50,
    size: 10,
    font: fontBold,
    color: C.navyText,
  });

  const pillW = Math.max(58, fontBold.widthOfTextAtSize(displayPrice, 10) + 16);
  const pillX = margin + contentW - pillW - 12;
  page.drawText("Total price", {
    x: pillX,
    y: yTop - 36,
    size: 7,
    font,
    color: C.muted,
  });
  page.drawRectangle({
    x: pillX,
    y: thumbY + 10,
    width: pillW,
    height: 22,
    color: C.pillBg,
    borderColor: rgb(0.75, 0.88, 0.98),
    borderWidth: 0.8,
  });
  page.drawText(displayPrice, {
    x: pillX + 8,
    y: thumbY + 16,
    size: 10,
    font: fontBold,
    color: C.greenDark,
  });

  const stampY = combinedBottom + 8;
  if (stampArt) {
    page.drawImage(stampArt, {
      x: stampX,
      y: stampY,
      width: stampW,
      height: stampH,
    });
  }

  const payRows = [
    {
      label: "Total booking amount (order value)",
      value: `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`,
    },
    {
      label: "Advance payment",
      value: `Rs.${input.amountPaidInr.toLocaleString("en-IN")}`,
      highlight: true,
    },
    {
      label: "Remaining balance (if any)",
      value: `Rs.${input.balanceInr.toLocaleString("en-IN")}`,
    },
  ];

  let rowY = yTop - pkgSectionH - 18;
  for (const r of payRows) {
    if (r.highlight) {
      page.drawRectangle({
        x: margin + 8,
        y: rowY - 3,
        width: payValueRight - margin - 8,
        height: 16,
        color: C.pillBg,
      });
    }
    page.drawText(r.label, {
      x: margin + 12,
      y: rowY,
      size: 8,
      font,
      color: C.text,
      maxWidth: payValueRight - margin - 24,
    });
    const tw = fontBold.widthOfTextAtSize(r.value, 9);
    page.drawText(r.value, {
      x: payValueRight - tw,
      y: rowY,
      size: 9,
      font: fontBold,
      color: r.highlight ? C.navyText : C.text,
    });
    rowY -= 18;
  }

  yTop = combinedBottom - 8;

  // ── Please note ─────────────────────────────────────────────────────────
  const notesH = 86;
  const notesBottom = yTop - notesH;
  drawCard(page, margin, notesBottom, contentW, notesH);
  drawSectionTitle(
    page,
    margin + 10,
    yTop - 14,
    "Please note (Do / Don't)",
    iconAlert,
    fontBold,
  );

  const halfW = (contentW - 28) / 2;
  const doX = margin + 12;
  const dontX = margin + 12 + halfW + 4;
  let ny = yTop - 36;

  DO_NOTES.forEach((n, i) => {
    const yy = ny - i * 16;
    if (iconCheck) {
      page.drawImage(iconCheck, { x: doX, y: yy - 1, width: 10, height: 10 });
    }
    page.drawText(pdfSafeText(n, 70), {
      x: doX + 14,
      y: yy,
      size: 7,
      font,
      color: C.text,
      maxWidth: halfW - 18,
    });
  });

  DONT_NOTES.forEach((n, i) => {
    const yy = ny - i * 16;
    if (iconX) {
      page.drawImage(iconX, { x: dontX, y: yy - 1, width: 10, height: 10 });
    }
    page.drawText(pdfSafeText(n, 70), {
      x: dontX + 14,
      y: yy,
      size: 7,
      font,
      color: C.text,
      maxWidth: halfW - 18,
    });
  });

  // ── Footer (full-width image banner) ───────────────────────────────────
  const footH = footerArt
    ? width * (footerArt.height / footerArt.width)
    : 76;
  if (footerArt) {
    page.drawImage(footerArt, { x: 0, y: 0, width, height: footH });
  } else {
    page.drawRectangle({ x: 0, y: 0, width, height: footH, color: C.navy });
  }

  return doc.save();
}
