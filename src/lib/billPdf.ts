import path from "path";
import { readFile } from "fs/promises";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

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

async function loadPublicPng(...relativePaths: string[]): Promise<Uint8Array | null> {
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

async function embedPng(
  doc: PDFDocument,
  ...relativePaths: string[]
): Promise<PDFImage | null> {
  const bytes = await loadPublicPng(...relativePaths);
  if (!bytes) return null;
  try {
    return await doc.embedPng(bytes);
  } catch {
    return null;
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

const COLORS = {
  navy: rgb(0.04, 0.15, 0.27),
  navyDeep: rgb(0.02, 0.12, 0.22),
  navyMid: rgb(0.05, 0.22, 0.38),
  accentBlue: rgb(0.12, 0.53, 0.9),
  green: rgb(0.13, 0.63, 0.42),
  greenDark: rgb(0.05, 0.55, 0.32),
  orange: rgb(0.96, 0.62, 0.04),
  red: rgb(0.9, 0.22, 0.21),
  text: rgb(0.1, 0.14, 0.2),
  muted: rgb(0.42, 0.48, 0.55),
  white: rgb(1, 1, 1),
  pageBg: rgb(0.94, 0.96, 0.98),
  cardBorder: rgb(0.86, 0.9, 0.94),
  payHighlight: rgb(0.88, 0.95, 1),
  trustBg: rgb(0.97, 0.98, 0.995),
};

function drawImageFit(
  page: PDFPage,
  img: PDFImage,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  opacity = 1,
) {
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, {
    x: x + (maxW - w) / 2,
    y: y + (maxH - h) / 2,
    width: w,
    height: h,
    opacity,
  });
  return { w, h };
}

/** Split a package line into left label + right-aligned price. */
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
  "Keep this receipt and quote your Razorpay payment ID.",
];

const DONT_NOTES = [
  "Don't drink alcohol before diving or water activities.",
  "Don't ignore guide instructions; follow the briefing.",
  "Don't share payment IDs publicly or with strangers.",
];

export async function generateBillPdf(input: BillPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const margin = 28;

  const logo = await embedPng(
    doc,
    "book-scuba-goa-logo-transparent.png",
    "book-scuba-goa-logo.png",
  );
  const pkgIcon = await embedPng(doc, "bill/package-van.png");
  const footerArt = await embedPng(doc, "bill/footer-beach.png");
  const palmWm = await embedPng(doc, "bill/palm-watermark.png");
  const iconPerson = await embedPng(doc, "bill/icon-person.png");
  const iconGift = await embedPng(doc, "bill/icon-gift.png");
  const iconRupee = await embedPng(doc, "bill/icon-rupee.png");
  const iconAlert = await embedPng(doc, "bill/icon-alert.png");
  const iconPin = await embedPng(doc, "bill/icon-pin.png");
  const iconCheck = await embedPng(doc, "bill/icon-check.png");
  const iconX = await embedPng(doc, "bill/icon-x.png");
  const iconShield = await embedPng(doc, "bill/icon-shield.png");
  const iconBadge = await embedPng(doc, "bill/icon-badge.png");
  const iconHeadset = await embedPng(doc, "bill/icon-headset.png");
  const iconStar = await embedPng(doc, "bill/icon-star.png");

  const rawLines =
    input.packageLines && input.packageLines.length > 0
      ? input.packageLines.map((l) => pdfSafeText(l, 160))
      : [pdfSafeText(input.packageName, 120)];
  const packageLines =
    rawLines.length > 5
      ? [
          ...rawLines.slice(0, 5),
          pdfSafeText(`+ ${rawLines.length - 5} more item(s)`, 80),
        ]
      : rawLines;

  const pickupDisplay = input.pickupLocation?.trim()
    ? pdfSafeText(input.pickupLocation.trim(), 220)
    : "Not on file — we will confirm pickup by phone / email if needed.";

  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  // Page background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: COLORS.pageBg,
  });

  // ── Header (compact navy band) ──────────────────────────────────────────
  const headerH = 112;
  const logoSize = 92;
  page.drawRectangle({
    x: 0,
    y: height - headerH,
    width,
    height: headerH,
    color: COLORS.navy,
  });

  const logoTopPad = 10;
  const logoY = height - logoTopPad - logoSize;
  let brandTextX = margin;
  if (logo) {
    drawImageFit(page, logo, margin, logoY, logoSize, logoSize);
    brandTextX = margin + logoSize + 10;
  }

  page.drawText(pdfSafeText(SITE_NAME, 40), {
    x: brandTextX,
    y: logoY + logoSize - 24,
    size: 17,
    font: fontBold,
    color: COLORS.white,
  });
  page.drawText("PAYMENT RECEIPT / BILL", {
    x: brandTextX,
    y: logoY + logoSize - 44,
    size: 13,
    font: fontBold,
    color: COLORS.white,
  });
  page.drawText("Thank you for choosing Book Scuba Goa", {
    x: brandTextX,
    y: logoY + 6,
    size: 8.5,
    font,
    color: rgb(0.75, 0.88, 0.98),
  });

  // Paid badge + stamp (top-right; no hero image)
  const badgeLabel = input.isPartial ? "PARTIAL PAYMENT" : "PAID IN FULL";
  const badgeColor = input.isPartial ? COLORS.orange : COLORS.green;
  const badgeW = 118;
  const badgeH = 20;
  const badgeX = width - margin - badgeW;
  const badgeY = height - logoTopPad - 6 - badgeH;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: badgeColor,
  });
  page.drawText(badgeLabel, {
    x: badgeX + 10,
    y: badgeY + 6,
    size: 8.5,
    font: fontBold,
    color: COLORS.white,
  });
  page.drawText(input.isPartial ? "PARTIAL" : "PAID", {
    x: badgeX + 28,
    y: badgeY - 20,
    size: 16,
    font: fontBold,
    color: badgeColor,
  });

  // Generated chip
  const genText = pdfSafeText(`Generated ${generatedAt}`, 80);
  const genW = Math.min(200, font.widthOfTextAtSize(genText, 8) + 18);
  page.drawRectangle({
    x: width - margin - genW,
    y: height - headerH + 8,
    width: genW,
    height: 16,
    color: COLORS.navyDeep,
  });
  page.drawText(genText, {
    x: width - margin - genW + 8,
    y: height - headerH + 12,
    size: 7,
    font,
    color: rgb(0.82, 0.9, 0.98),
  });

  // ── Trust bar (full width, flush under header) ───────────────────────────
  const trustH = 38;
  const trustY = height - headerH - trustH;
  page.drawRectangle({
    x: 0,
    y: trustY,
    width,
    height: trustH,
    color: COLORS.trustBg,
  });
  page.drawLine({
    start: { x: 0, y: trustY },
    end: { x: width, y: trustY },
    thickness: 0.6,
    color: COLORS.cardBorder,
  });
  page.drawLine({
    start: { x: 0, y: trustY + trustH },
    end: { x: width, y: trustY + trustH },
    thickness: 0.6,
    color: COLORS.cardBorder,
  });

  const trustItems: { icon: PDFImage | null; title: string; sub: string }[] = [
    { icon: iconShield, title: "Secure Payment", sub: "Processed by Razorpay" },
    { icon: iconBadge, title: "Trusted Operator", sub: "100% Safe & Reliable" },
    { icon: iconHeadset, title: "24/7 Support", sub: "We're here to help" },
    { icon: iconStar, title: "Best Experiences", sub: "Memorable & Hassle-free" },
  ];
  const trustColW = width / 4;
  trustItems.forEach((item, i) => {
    const cx = i * trustColW + 14;
    if (item.icon) {
      page.drawImage(item.icon, {
        x: cx,
        y: trustY + 20,
        width: 13,
        height: 13,
      });
    }
    page.drawText(item.title, {
      x: cx + 17,
      y: trustY + 24,
      size: 7,
      font: fontBold,
      color: COLORS.text,
      maxWidth: trustColW - 24,
    });
    page.drawText(item.sub, {
      x: cx + 17,
      y: trustY + 13,
      size: 6,
      font,
      color: COLORS.muted,
      maxWidth: trustColW - 24,
    });
  });

  let yTop = trustY - 10;

  // Helper: section card header with icon
  const sectionHeader = (
    title: string,
    icon: PDFImage | null,
    top: number,
    cardH: number,
  ) => {
    const bottom = top - cardH;
    page.drawRectangle({
      x: margin,
      y: bottom,
      width: width - margin * 2,
      height: cardH,
      color: COLORS.white,
      borderColor: COLORS.cardBorder,
      borderWidth: 1,
    });
    if (icon) {
      page.drawImage(icon, {
        x: margin + 10,
        y: top - 26,
        width: 16,
        height: 16,
      });
    }
    page.drawText(title, {
      x: margin + (icon ? 32 : 12),
      y: top - 22,
      size: 11,
      font: fontBold,
      color: COLORS.navy,
    });
    return bottom;
  };

  // ── Customer & contact ──────────────────────────────────────────────────
  const guestH = 118;
  const guestTop = yTop;
  const guestBottom = sectionHeader("Customer & contact", iconPerson, guestTop, guestH);

  const colW = (width - margin * 2 - 24) / 3;
  const fields: { label: string; value: string }[] = [
    { label: "Customer name", value: pdfSafeText(input.customerName, 40) },
    { label: "Email", value: pdfSafeText(input.customerEmail, 42) },
    { label: "Phone", value: pdfSafeText(input.phone, 24) },
  ];
  fields.forEach((f, i) => {
    const fx = margin + 12 + i * colW;
    page.drawText(f.label, {
      x: fx,
      y: guestTop - 42,
      size: 7.5,
      font,
      color: COLORS.muted,
    });
    page.drawText(f.value, {
      x: fx,
      y: guestTop - 56,
      size: 9.5,
      font: fontBold,
      color: COLORS.text,
      maxWidth: colW - 8,
    });
  });

  // dashed divider
  page.drawLine({
    start: { x: margin + 12, y: guestTop - 70 },
    end: { x: width - margin - 12, y: guestTop - 70 },
    thickness: 0.6,
    color: COLORS.cardBorder,
    dashArray: [3, 2],
  });

  if (iconPin) {
    page.drawImage(iconPin, {
      x: margin + 12,
      y: guestBottom + 22,
      width: 14,
      height: 14,
    });
  }
  page.drawText("Pickup / meeting point (as you entered)", {
    x: margin + 30,
    y: guestBottom + 26,
    size: 7.5,
    font,
    color: COLORS.muted,
  });
  page.drawText(pickupDisplay, {
    x: margin + 30,
    y: guestBottom + 12,
    size: 9,
    font: fontBold,
    color: COLORS.text,
    maxWidth: width - margin * 2 - 44,
  });

  yTop = guestBottom - 12;

  // ── Packages & guests ───────────────────────────────────────────────────
  const pkgBodyLines = Math.max(1, packageLines.length);
  const pkgH = 78 + pkgBodyLines * 12;
  const pkgTop = yTop;
  const pkgBottom = sectionHeader("Packages & guests", iconGift, pkgTop, pkgH);

  // soft watermark
  if (palmWm) {
    page.drawImage(palmWm, {
      x: width - margin - 120,
      y: pkgBottom + 8,
      width: 100,
      height: 70,
      opacity: 0.18,
    });
  }

  // Inner package row
  page.drawRectangle({
    x: margin + 10,
    y: pkgBottom + 10,
    width: width - margin * 2 - 20,
    height: pkgH - 42,
    color: rgb(0.97, 0.99, 0.98),
    borderColor: rgb(0.82, 0.92, 0.88),
    borderWidth: 0.8,
  });

  if (pkgIcon) {
    page.drawImage(pkgIcon, {
      x: margin + 18,
      y: pkgBottom + (pkgH - 42) / 2 - 8,
      width: 48,
      height: 48,
    });
  }

  const pkgTextX = margin + 78;
  const priceRightX = width - margin - 18;
  let py = pkgTop - 48;
  for (let i = 0; i < packageLines.length; i++) {
    const line = packageLines[i];
    const { label, price } = parsePackageLine(line);
    const isMetaLine = /total persons|units for this booking/i.test(label);
    const displayPrice =
      price ??
      (!isMetaLine && i === 0 && input.fullAmountInr > 0
        ? `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`
        : null);

    page.drawText(label, {
      x: pkgTextX,
      y: py,
      size: 9.5,
      font: fontBold,
      color: COLORS.text,
      maxWidth: priceRightX - pkgTextX - 72,
    });

    if (displayPrice) {
      const pw = fontBold.widthOfTextAtSize(displayPrice, 9.5);
      page.drawText(displayPrice, {
        x: priceRightX - pw,
        y: py,
        size: 9.5,
        font: fontBold,
        color: COLORS.greenDark,
      });
    }
    py -= 14;
  }

  page.drawText(
    pdfSafeText(
      `Trip date: ${input.date || "—"}   |   Headcount (booked): ${input.people}`,
      120,
    ),
    {
      x: pkgTextX,
      y: pkgBottom + 18,
      size: 8,
      font,
      color: COLORS.accentBlue,
    },
  );

  yTop = pkgBottom - 12;

  // ── Payment details ─────────────────────────────────────────────────────
  const payH = 108;
  const payTop = yTop;
  const payBottom = sectionHeader("Payment details (INR)", iconRupee, payTop, payH);

  const payRows: {
    label: string;
    value: string;
    strong?: boolean;
    highlight?: boolean;
  }[] = [
    {
      label: "Total booking amount (order value)",
      value: `Rs.${input.fullAmountInr.toLocaleString("en-IN")}`,
    },
    {
      label: "Advance payment",
      value: `Rs.${input.amountPaidInr.toLocaleString("en-IN")}`,
      strong: true,
      highlight: true,
    },
    {
      label: "Remaining balance (if any)",
      value: `Rs.${input.balanceInr.toLocaleString("en-IN")}`,
      strong: true,
    },
  ];

  let rowY = payTop - 48;
  for (const r of payRows) {
    if (r.highlight) {
      page.drawRectangle({
        x: margin + 10,
        y: rowY - 4,
        width: width - margin * 2 - 20,
        height: 18,
        color: COLORS.payHighlight,
      });
    }
    page.drawText(r.label, {
      x: margin + 16,
      y: rowY,
      size: 9,
      font: r.strong ? fontBold : font,
      color: COLORS.text,
    });
    const f: PDFFont = r.strong ? fontBold : font;
    const tw = f.widthOfTextAtSize(r.value, 10);
    page.drawText(r.value, {
      x: width - margin - 16 - tw,
      y: rowY,
      size: 10,
      font: f,
      color: r.highlight ? COLORS.navy : COLORS.text,
    });
    rowY -= 22;
  }

  yTop = payBottom - 12;

  // ── Please note (Do / Don't) ────────────────────────────────────────────
  const notesH = 108;
  const notesTop = yTop;
  const notesBottom = sectionHeader("Please note (Do / Don't)", iconAlert, notesTop, notesH);

  const halfW = (width - margin * 2 - 28) / 2;
  const leftX = margin + 14;
  const rightX = margin + 14 + halfW + 8;

  let ny = notesTop - 44;
  DO_NOTES.forEach((n, i) => {
    const yy = ny - i * 18;
    if (iconCheck) {
      page.drawImage(iconCheck, {
        x: leftX,
        y: yy - 2,
        width: 12,
        height: 12,
      });
    }
    page.drawText(pdfSafeText(n, 70), {
      x: leftX + 16,
      y: yy,
      size: 7.5,
      font,
      color: COLORS.text,
      maxWidth: halfW - 20,
    });
  });

  DONT_NOTES.forEach((n, i) => {
    const yy = ny - i * 18;
    if (iconX) {
      page.drawImage(iconX, {
        x: rightX,
        y: yy - 2,
        width: 12,
        height: 12,
      });
    }
    page.drawText(pdfSafeText(n, 70), {
      x: rightX + 16,
      y: yy,
      size: 7.5,
      font,
      color: COLORS.text,
      maxWidth: halfW - 20,
    });
  });

  yTop = notesBottom - 10;

  // ── Website QR bar (no payment/order IDs on the bill) ───────────────────
  const txBarH = 58;
  const txBarY = Math.max(78, yTop - txBarH);
  page.drawRectangle({
    x: margin,
    y: txBarY,
    width: width - margin * 2,
    height: txBarH,
    color: COLORS.navy,
  });

  page.drawText("Book Scuba Goa", {
    x: margin + 14,
    y: txBarY + 32,
    size: 11,
    font: fontBold,
    color: COLORS.white,
  });
  page.drawText(pdfSafeText(SITE_URL, 60), {
    x: margin + 14,
    y: txBarY + 16,
    size: 8.5,
    font,
    color: rgb(0.75, 0.88, 0.98),
  });

  const qrBytes = await tryLoadQrBytes();
  if (qrBytes) {
    try {
      const qr = await doc.embedPng(qrBytes);
      const qrSize = 40;
      const qrBoxW = 118;
      const qrBoxX = width - margin - qrBoxW - 8;
      const qrBoxY = txBarY + 7;
      page.drawRectangle({
        x: qrBoxX,
        y: qrBoxY,
        width: qrBoxW,
        height: 44,
        color: COLORS.white,
      });
      page.drawImage(qr, {
        x: qrBoxX + 4,
        y: qrBoxY + 2,
        width: qrSize,
        height: qrSize,
      });
      page.drawText("Scan for website", {
        x: qrBoxX + 48,
        y: qrBoxY + 28,
        size: 6.5,
        font: fontBold,
        color: COLORS.navy,
      });
      page.drawText(pdfSafeText(SITE_URL.replace(/^https?:\/\//, ""), 40), {
        x: qrBoxX + 48,
        y: qrBoxY + 14,
        size: 6.5,
        font,
        color: COLORS.greenDark,
        maxWidth: 64,
      });
    } catch {
      /* ignore */
    }
  }

  // ── Beach thank-you footer ──────────────────────────────────────────────
  const footH = 64;
  if (footerArt) {
    page.drawImage(footerArt, {
      x: 0,
      y: 0,
      width,
      height: footH,
      opacity: 0.95,
    });
    // Darken for text readability
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: footH,
      color: COLORS.navyDeep,
      opacity: 0.35,
    });
  } else {
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: footH,
      color: COLORS.navy,
    });
  }

  const thanks = "Thank you for choosing Book Scuba Goa";
  const thanksW = fontOblique.widthOfTextAtSize(thanks, 12);
  page.drawText(thanks, {
    x: (width - thanksW) / 2,
    y: 28,
    size: 12,
    font: fontOblique,
    color: COLORS.white,
  });

  return doc.save();
}
