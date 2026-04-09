/** Returns YouTube embed URL for watch/share links, or null if not YouTube. */
export function getYoutubeEmbedSrc(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (!id) return null;
      const q = `autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${encodeURIComponent(id)}`;
      return `https://www.youtube.com/embed/${id}?${q}`;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      let id = u.searchParams.get("v");
      if (!id && u.pathname.startsWith("/embed/")) {
        id = u.pathname.replace(/^\/embed\//, "").split("/")[0] ?? null;
      }
      if (!id) return null;
      const q = `autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${encodeURIComponent(id)}`;
      return `https://www.youtube.com/embed/${id}?${q}`;
    }
  } catch {
    return null;
  }
  return null;
}
