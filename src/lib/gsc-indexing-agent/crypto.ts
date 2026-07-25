import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * AES-256-GCM helpers for OAuth refresh tokens.
 * Key: GOOGLE_TOKEN_ENCRYPTION_KEY (32+ chars recommended; hashed to 32 bytes).
 */
function keyBytes(): Buffer | null {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) return null;
  return createHash("sha256").update(raw).digest();
}

export function canEncryptSecrets(): boolean {
  return Boolean(keyBytes());
}

/** Returns `enc:v1:<iv_b64>:<tag_b64>:<cipher_b64>` or null if key missing. */
export function encryptSecret(plain: string): string | null {
  const key = keyBytes();
  if (!key || !plain) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptSecret(payload: string): string | null {
  const key = keyBytes();
  if (!key || !payload.startsWith("enc:v1:")) return null;
  try {
    const parts = payload.split(":");
    if (parts.length !== 5) return null;
    const iv = Buffer.from(parts[2]!, "base64url");
    const tag = Buffer.from(parts[3]!, "base64url");
    const data = Buffer.from(parts[4]!, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
