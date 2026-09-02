import type { ChatBookingState, ChatBubble } from "./types";

const STATE_KEY = "bsg_chat_booking_v1";
const BUBBLES_KEY = "bsg_chat_bubbles_v1";

export const DEFAULT_BOOKING_STATE: ChatBookingState = {
  step: "welcome",
  date: "",
  people: 0,
  pickup: "",
  categoryId: null,
  selectedKeys: [],
  name: "",
  phone: "",
  email: "",
  payMode: "min",
};

export function loadBookingState(): ChatBookingState {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return { ...DEFAULT_BOOKING_STATE };
    const parsed = JSON.parse(raw) as ChatBookingState;
    return { ...DEFAULT_BOOKING_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_BOOKING_STATE };
  }
}

export function saveBookingState(state: ChatBookingState): void {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function clearBookingState(): void {
  try {
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(BUBBLES_KEY);
  } catch {
    /* ignore */
  }
}

export function loadBubbles(): ChatBubble[] {
  try {
    const raw = sessionStorage.getItem(BUBBLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatBubble[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBubbles(bubbles: ChatBubble[]): void {
  try {
    sessionStorage.setItem(BUBBLES_KEY, JSON.stringify(bubbles.slice(-40)));
  } catch {
    /* ignore */
  }
}
