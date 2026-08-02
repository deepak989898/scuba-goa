/**
 * Optional emergency Firestore READ pause.
 *
 * Off by default. Only activates when you explicitly set a future until-time:
 *   FIRESTORE_READ_PAUSE_UNTIL=2026-08-04T00:00:00+05:30
 *   NEXT_PUBLIC_FIRESTORE_READ_PAUSE_UNTIL=...  (same value — needed for client getDb)
 *
 * Force off even if until is set:
 *   FIRESTORE_READ_PAUSE_DISABLED=1
 *   NEXT_PUBLIC_FIRESTORE_READ_PAUSE_DISABLED=1
 */

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
    ""
  );
}

export function getFirestoreReadPauseUntilMs(): number {
  const iso = getFirestoreReadPauseUntilIso();
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** True only while an explicit until-time env is in the future. */
export function isFirestoreReadPaused(): boolean {
  const until = getFirestoreReadPauseUntilMs();
  if (!until) return false;
  return Date.now() < until;
}

export function firestoreReadPauseMessage(): string {
  const until = getFirestoreReadPauseUntilIso();
  if (!until) {
    return "Firestore reads are not paused.";
  }
  return `Firestore reads paused until ${until} (quota protection). Set FIRESTORE_READ_PAUSE_DISABLED=1 and NEXT_PUBLIC_FIRESTORE_READ_PAUSE_DISABLED=1 on Vercel, then redeploy, to resume.`;
}
