/** Extract 11-char YouTube video id from common URL shapes (watch, shorts, embed, youtu.be). */
export function getYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const looksLikeId = /^[\w-]{11}$/.test(trimmed);
  if (looksLikeId) return trimmed;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]?.split("?")[0];
      return id && id.length >= 8 ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const v = u.searchParams.get("v");
      if (v && v.length >= 8) return v;

      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) {
        return parts[1]!.split("?")[0] ?? null;
      }
      if (parts[0] === "shorts" && parts[1]) {
        return parts[1]!.split("?")[0] ?? null;
      }
      if (parts[0] === "live" && parts[1]) {
        return parts[1]!.split("?")[0] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}
