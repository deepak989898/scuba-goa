/** Normalized level for optional hero bed music (video muted when this plays). */
export const HERO_AMBIENT_VOLUME = 0.42;

export type VideoAudioInference = "has-track" | "no-track" | "unknown";

/** Public URL for MP3/WebM/OGG bed music when the hero video has no audio stream (or admin forces it). */
export function getHeroFallbackMusicSrc(): string | undefined {
  const u = process.env.NEXT_PUBLIC_HERO_FALLBACK_MUSIC_URL?.trim();
  return u || undefined;
}

/**
 * Best-effort: some browsers expose `audioTracks`; many (e.g. Chrome) do not → `"unknown"`.
 * With `"unknown"` we only play the video’s own audio (no automatic bed music).
 */
export function inferNativeVideoHasAudibleTrack(
  video: HTMLVideoElement,
): VideoAudioInference {
  const tracks = (
    video as HTMLVideoElement & { audioTracks?: { length: number } }
  ).audioTracks;
  if (tracks == null || typeof tracks.length !== "number") return "unknown";
  if (tracks.length === 0) return "no-track";
  return "has-track";
}
