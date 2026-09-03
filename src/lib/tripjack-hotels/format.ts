export function formatHotelPriceInr(amount: number, currency = "INR"): string {
  if (currency !== "INR") {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff > 0 ? diff : 1;
}

export function isValidPan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhoneIndia(phone: string): boolean {
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 12;
}
