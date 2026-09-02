/** Shared 30s auto-open timing for chat widget (page load, not component mount). */
export const CHAT_AUTO_OPEN_DELAY_MS = 30_000;
export const CHAT_AUTO_OPEN_SESSION_KEY = "bsg_chat_auto_opened";

const pageLoadAt =
  typeof window !== "undefined" ? Date.now() : 0;

export function msUntilChatAutoOpen(): number {
  if (typeof window === "undefined") return CHAT_AUTO_OPEN_DELAY_MS;
  return Math.max(0, CHAT_AUTO_OPEN_DELAY_MS - (Date.now() - pageLoadAt));
}

export function chatAutoOpenAlreadyShown(): boolean {
  try {
    return sessionStorage.getItem(CHAT_AUTO_OPEN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markChatAutoOpenShown(): void {
  try {
    sessionStorage.setItem(CHAT_AUTO_OPEN_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
