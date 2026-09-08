/** Nights between check-in and check-out (checkout day excluded). */
export function countHotelNights(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T12:00:00`).getTime();
  const b = new Date(`${checkOut}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function computeRoomStayTotalInr(
  pricePerNight: number,
  nights: number,
): number {
  if (!Number.isFinite(pricePerNight) || pricePerNight <= 0 || nights < 1) return 0;
  return Math.round(pricePerNight * nights);
}

export function minCheckInIso(): string {
  const d = new Date();
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function defaultCheckOutFrom(checkIn: string): string {
  const d = new Date(`${checkIn}T12:00:00`);
  if (Number.isNaN(d.getTime())) return checkIn;
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}
