/** Dispatched to open the ₹200 WhatsApp offer popup from anywhere (e.g. sticky bar). */
export const BSG_OPEN_OFFER_EVENT = "bsg:open-offer-popup";

export function openLeadOfferPopup(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BSG_OPEN_OFFER_EVENT));
}
