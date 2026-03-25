import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

export async function generateBillPdf(input: BillPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const size = 10;
  const small = 8;
  const margin = 40;
  let y = height - margin;

  const line = (text: string, bold = false, s = size) => {
    const safe = pdfSafeText(text, 800);
    page.drawText(safe, {
      x: margin,
      y,
      size: s,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.15, 0.2),
      maxWidth: width - margin * 2,
    });
    y -= s + 4;
  };

  line(SITE_NAME, true, 16);
  y -= 4;
  line("Payment receipt / bill", true, 12);
  y -= 8;
  line(
    `Date: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
  );
  y -= 12;

  line(`Customer: ${input.customerName}`, true);
  line(`Email: ${input.customerEmail}`);
  line(`Phone: ${input.phone}`);
  line(`Activity / package: ${input.packageName}`);
  line(`Trip date: ${input.date}`);
  line(`Guests: ${input.people}`);
  y -= 8;

  line(`Full order value: Rs.${input.fullAmountInr.toLocaleString("en-IN")}`, true);
  line(
    `Amount paid (this transaction): Rs.${input.amountPaidInr.toLocaleString("en-IN")}`,
    true
  );
  if (input.isPartial && input.balanceInr > 0) {
    line(`Balance due: Rs.${input.balanceInr.toLocaleString("en-IN")}`, true);
  }
  y -= 8;
  line(`Razorpay payment ID: ${input.paymentId}`);
  line(`Razorpay order ID: ${input.orderId}`);
  y -= 16;

  page.drawText(pdfSafeText(SITE_URL, 200), {
    x: margin,
    y: margin,
    size: small,
    font,
    color: rgb(0.4, 0.45, 0.5),
  });

  return doc.save();
}
