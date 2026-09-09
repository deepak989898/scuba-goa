export type BookingUpdateInput = {
  customerName: string;
  phone: string;
  email?: string;
  packageName: string;
  serviceSlug?: string;
  pickupLocation: string;
  date: string;
  people: number;
  fullAmountInr: number;
  advanceInr: number;
  notes?: string;
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

export function validateBookingUpdateInput(
  raw: Partial<BookingUpdateInput>,
): { ok: true; value: BookingUpdateInput } | { ok: false; error: string } {
  const customerName = String(raw.customerName ?? "").trim();
  if (customerName.length < 2) {
    return { ok: false, error: "Enter guest name (at least 2 characters)." };
  }

  const phone = normalizePhone(String(raw.phone ?? ""));
  if (phone.length < 10) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  const packageName = String(raw.packageName ?? "").trim();
  if (packageName.length < 2) {
    return { ok: false, error: "Enter service / package name." };
  }

  const pickupLocation = String(raw.pickupLocation ?? "").trim();
  if (pickupLocation.length < 2) {
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
  const serviceSlug = String(raw.serviceSlug ?? "").trim();
  const notes = String(raw.notes ?? "").trim();

  return {
    ok: true,
    value: {
      customerName,
      phone,
      email: email || undefined,
      packageName,
      serviceSlug: serviceSlug || undefined,
      pickupLocation,
      date,
      people,
      fullAmountInr,
      advanceInr,
      notes: notes || undefined,
    },
  };
}

export function syncCartItemsForInvoice(
  existing: unknown,
  packageName: string,
  people: number,
  fullAmountInr: number,
): unknown[] | undefined {
  if (!Array.isArray(existing) || existing.length === 0) return undefined;
  return existing.map((raw, index) => {
    if (!raw || typeof raw !== "object") return raw;
    const o = { ...(raw as Record<string, unknown>) };
    if (index === 0) {
      o.name = packageName;
      o.quantity = people;
      o.lineTotal = fullAmountInr;
    }
    return o;
  });
}

export function buildBookingUpdatePatch(
  input: BookingUpdateInput,
  opts: {
    actorId: string;
    packageImageUrl?: string;
    existingCartItems?: unknown;
  },
): Record<string, unknown> {
  const advancePaise = input.advanceInr * 100;
  const fullPaise = input.fullAmountInr * 100;
  const balancePaise = Math.max(0, fullPaise - advancePaise);
  const cartItems = syncCartItemsForInvoice(
    opts.existingCartItems,
    input.packageName,
    input.people,
    input.fullAmountInr,
  );

  const patch: Record<string, unknown> = {
    customerName: input.customerName,
    phone: input.phone,
    email: input.email ?? "",
    packageName: input.packageName,
    pickupLocation: input.pickupLocation,
    date: input.date,
    people: input.people,
    payUnits: input.people,
    amountPaise: advancePaise,
    fullAmountPaise: fullPaise,
    balancePaise,
    paymentMode: balancePaise > 0 ? "partial" : "full",
    notes: input.notes ?? null,
    updatedAt: new Date().toISOString(),
    updatedBy: opts.actorId,
  };

  if (input.serviceSlug) {
    patch.serviceSlug = input.serviceSlug;
  }
  if (opts.packageImageUrl) {
    patch.packageImageUrl = opts.packageImageUrl;
  }
  if (cartItems) {
    patch.cartItems = cartItems;
  }

  return patch;
}
