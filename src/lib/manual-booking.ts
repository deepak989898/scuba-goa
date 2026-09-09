export type ManualBookingInput = {
  customerName: string;
  phone: string;
  email?: string;
  serviceSlug?: string;
  serviceName?: string;
  hotel: string;
  date: string;
  people?: number;
  fullAmountInr: number;
  advanceInr: number;
  notes?: string;
};

export type ManualBookingFirestoreDoc = Record<string, unknown> & {
  source: "manual";
  manualBookingRef: string;
  customerName: string;
  phone: string;
  email: string;
  packageName: string;
  serviceSlug?: string;
  pickupLocation: string;
  date: string;
  people: number;
  payUnits: number;
  amountPaise: number;
  fullAmountPaise: number;
  balancePaise: number;
  paymentMode: "partial" | "full";
  status: "paid";
  channel: "admin_manual";
  notes?: string;
  createdAt: string;
  createdBy: string;
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

export function validateManualBookingInput(
  raw: Partial<ManualBookingInput>,
): { ok: true; value: ManualBookingInput } | { ok: false; error: string } {
  const customerName = String(raw.customerName ?? "").trim();
  if (customerName.length < 2) {
    return { ok: false, error: "Enter guest name (at least 2 characters)." };
  }

  const phone = normalizePhone(String(raw.phone ?? ""));
  if (phone.length < 10) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  const serviceName = String(raw.serviceName ?? "").trim();
  const serviceSlug = String(raw.serviceSlug ?? "").trim();
  if (!serviceName && !serviceSlug) {
    return { ok: false, error: "Select or enter a service / activity." };
  }

  const hotel = String(raw.hotel ?? "").trim();
  if (hotel.length < 2) {
    return { ok: false, error: "Enter hotel or pickup location." };
  }

  const date = String(raw.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Choose a valid trip date." };
  }

  const people = Math.max(1, Math.min(99, Math.round(Number(raw.people) || 1)));
  const fullAmountInr = Math.round(Number(raw.fullAmountInr));
  const advanceInr = Math.round(Number(raw.advanceInr));

  if (!Number.isFinite(fullAmountInr) || fullAmountInr <= 0) {
    return { ok: false, error: "Enter full booking amount (INR)." };
  }
  if (!Number.isFinite(advanceInr) || advanceInr <= 0) {
    return { ok: false, error: "Enter advance amount paid (INR)." };
  }
  if (advanceInr > fullAmountInr) {
    return { ok: false, error: "Advance cannot be more than full amount." };
  }

  const email = String(raw.email ?? "").trim();

  return {
    ok: true,
    value: {
      customerName,
      phone,
      email: email || undefined,
      serviceSlug: serviceSlug || undefined,
      serviceName: serviceName || undefined,
      hotel,
      date,
      people,
      fullAmountInr,
      advanceInr,
      notes: String(raw.notes ?? "").trim() || undefined,
    },
  };
}

export function createManualBookingId(): string {
  return `manual_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildManualBookingDoc(
  input: ManualBookingInput,
  opts: {
    bookingId: string;
    packageName: string;
    actorId: string;
  },
): ManualBookingFirestoreDoc {
  const advancePaise = input.advanceInr * 100;
  const fullPaise = input.fullAmountInr * 100;
  const balancePaise = Math.max(0, fullPaise - advancePaise);

  return {
    source: "manual",
    manualBookingRef: opts.bookingId,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email ?? "",
    packageName: opts.packageName,
    serviceSlug: input.serviceSlug,
    pickupLocation: input.hotel,
    date: input.date,
    people: input.people ?? 1,
    payUnits: input.people ?? 1,
    amountPaise: advancePaise,
    fullAmountPaise: fullPaise,
    balancePaise,
    paymentMode: balancePaise > 0 ? "partial" : "full",
    status: "paid",
    channel: "admin_manual",
    notes: input.notes,
    createdAt: new Date().toISOString(),
    createdBy: opts.actorId,
  };
}
