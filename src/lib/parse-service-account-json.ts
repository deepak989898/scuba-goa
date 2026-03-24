/**
 * Parses FIREBASE_SERVICE_ACCOUNT_KEY from env (one-line JSON).
 * Handles BOM, stray whitespace, and optional outer quotes.
 */
export function tryParseServiceAccountJson(raw: string):
  | {
      ok: true;
      projectId: string;
      clientEmail: string;
      privateKey: string;
    }
  | { ok: false; message: string } {
  let s = raw.trim();
  if (s.length === 0) {
    return { ok: false, message: "Value is empty after trim" };
  }
  // UTF-8 BOM
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim();
  }
  // Optional wrapping quotes (copy-paste mistakes)
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1);
  }

  let cred: Record<string, unknown>;
  try {
    cred = JSON.parse(s) as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON";
    return {
      ok: false,
      message: `${msg}. Use a single-line JSON with \`private_key\` newlines as \\n (no real line breaks inside the value).`,
    };
  }

  const projectId = String(cred.project_id ?? "").trim();
  const clientEmail = String(cred.client_email ?? "").trim();
  const privateKey = String(cred.private_key ?? "").trim();

  if (!projectId || !clientEmail || !privateKey) {
    return {
      ok: false,
      message:
        "JSON must include project_id, client_email, and private_key fields.",
    };
  }

  return { ok: true, projectId, clientEmail, privateKey };
}
