/**
 * Emergency Firestore READ pause.
 *
 * Default: pause until 2026-08-03 00:00 Asia/Kolkata (tomorrow), then auto-resume.
 * Override:
 *   FIRESTORE_READ_PAUSE_UNTIL=2026-08-04T00:00:00+05:30
 *   FIRESTORE_READ_PAUSE_DISABLED=1   (force resume early)
 * Client mirrors via NEXT_PUBLIC_* of the same names.
 */

/** End of the burn day — resume at local midnight IST 3 Aug 2026. */
export const DEFAULT_FIRESTORE_READ_PAUSE_UNTIL =
  "2026-08-03T00:00:00+05:30";

function envFlag(name: string): string {
  if (typeof process === "undefined") return "";
  return String(process.env[name] ?? "").trim();
}

export function getFirestoreReadPauseUntilIso(): string {
  if (
    envFlag("FIRESTORE_READ_PAUSE_DISABLED") === "1" ||
    envFlag("NEXT_PUBLIC_FIRESTORE_READ_PAUSE_DISABLED") === "1"
  ) {
    return "";
  }
  return (
    envFlag("FIRESTORE_READ_PAUSE_UNTIL") ||
    envFlag("NEXT_PUBLIC_FIRESTORE_READ_PAUSE_UNTIL") ||
    DEFAULT_FIRESTORE_READ_PAUSE_UNTIL
  );
}

export function getFirestoreReadPauseUntilMs(): number {
  const iso = getFirestoreReadPauseUntilIso();
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** True while emergency pause is active (blocks heavy reads). */
export function isFirestoreReadPaused(): boolean {
  const until = getFirestoreReadPauseUntilMs();
  if (!until) return false;
  return Date.now() < until;
}

export function firestoreReadPauseMessage(): string {
  const until = getFirestoreReadPauseUntilIso() || DEFAULT_FIRESTORE_READ_PAUSE_UNTIL;
  return `Firestore reads paused until ${until} (quota protection). Auto-resumes after that. Close admin tabs. Set FIRESTORE_READ_PAUSE_DISABLED=1 on Vercel to resume early.`;
}
