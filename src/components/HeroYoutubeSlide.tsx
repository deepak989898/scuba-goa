"use client";

import { useEffect, useRef } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { HERO_AMBIENT_VOLUME } from "@/lib/hero-audio";
import { loadYoutubeIframeApi } from "@/lib/load-youtube-iframe-api";

type YTPlayerInstance = { destroy: () => void };

type YTPlayerTarget = {
  mute: () => void;
  unMute: () => void;
  setVolume: (n: number) => void;
  playVideo: () => void;
};

/**
 * YouTube hero: muted autoplay. Either unmutes the iframe after first gesture (video’s own audio)
 * or keeps it muted and plays `ambientMusicSrc` when `useAmbientMusic` is set / no separate track API.
 */
export function HeroYoutubeSlide({
  videoId,
  posterSrc,
  alt,
  onEnded,
  shouldLoop,
  ambientMusicSrc,
  useAmbientMusic,
  heroAudibleSpent,
  onHeroAudibleConsumed,
}: {
  videoId: string;
  posterSrc: string;
  alt: string;
  onEnded: () => void;
  shouldLoop: boolean;
  ambientMusicSrc?: string;
  useAmbientMusic?: boolean;
  heroAudibleSpent: boolean;
  onHeroAudibleConsumed: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const removeSoundUnlockRef = useRef<(() => void) | null>(null);

  const effectiveAmbientSrc = ambientMusicSrc?.trim() ?? "";

  useEffect(() => {
    let cancelled = false;
    const mountEl = hostRef.current;
    if (!mountEl) return;

    const stopAmbient = () => {
      const a = audioRef.current;
      if (!a) return;
      a.pause();
      a.removeAttribute("src");
      void a.load();
    };

    void loadYoutubeIframeApi().then(() => {
      if (cancelled || !hostRef.current) return;

      const YT = window.YT as
        | {
            Player: new (
              el: HTMLElement,
              opts: Record<string, unknown>,
            ) => YTPlayerInstance;
            PlayerState: { ENDED: number };
          }
        | undefined;

      if (!YT?.Player) return;

      const host = hostRef.current;
      if (!host) return;

      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      removeSoundUnlockRef.current?.();
      removeSoundUnlockRef.current = null;
      stopAmbient();

      const ENDED = YT.PlayerState?.ENDED ?? 0;

      const playerVars: Record<string, string | number | undefined> = {
        autoplay: 1,
        mute: 1,
        controls: 0,
        playsinline: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        fs: 0,
        cc_load_policy: 0,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      };
      if (shouldLoop) {
        playerVars.loop = 1;
        playerVars.playlist = videoId;
      }

      const player = new YT.Player(host, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars,
        events: {
          onReady: (e: { target: YTPlayerTarget }) => {
            try {
              e.target.mute();
              e.target.playVideo();
            } catch {
              /* ignore */
            }

            if (heroAudibleSpent) {
              return;
            }

            if (useAmbientMusic && !effectiveAmbientSrc) {
              return;
            }

            const useBed = Boolean(useAmbientMusic && effectiveAmbientSrc);

            if (useBed) {
              const a = audioRef.current;
              if (a && effectiveAmbientSrc) {
                a.src = effectiveAmbientSrc;
                a.loop = shouldLoop;
                a.volume = HERO_AMBIENT_VOLUME;
                const onAmbientPlaying = () => {
                  onHeroAudibleConsumed();
                  a.removeEventListener("playing", onAmbientPlaying);
                };
                a.addEventListener("playing", onAmbientPlaying);
                const unlock = () => {
                  void a.play();
                };
                void a.play().catch(() => {
                  const onPointer = () => {
                    unlock();
                    window.removeEventListener("pointerdown", onPointer, true);
                    removeSoundUnlockRef.current = null;
                  };
                  window.addEventListener("pointerdown", onPointer, {
                    capture: true,
                    once: true,
                  });
                  removeSoundUnlockRef.current = () => {
                    window.removeEventListener("pointerdown", onPointer, true);
                    removeSoundUnlockRef.current = null;
                  };
                });
              }
              return;
            }

            const unlock = () => {
              try {
                e.target.unMute();
                e.target.setVolume(100);
                onHeroAudibleConsumed();
              } catch {
                /* ignore */
              }
            };
            const onPointer = () => {
              unlock();
              window.removeEventListener("pointerdown", onPointer, true);
              removeSoundUnlockRef.current = null;
            };
            window.addEventListener("pointerdown", onPointer, {
              capture: true,
              once: true,
            });
            removeSoundUnlockRef.current = () => {
              window.removeEventListener("pointerdown", onPointer, true);
              removeSoundUnlockRef.current = null;
            };
          },
          onStateChange: (e: { data: number }) => {
            if (!shouldLoop && e.data === ENDED) onEnded();
          },
          onError: () => {
            if (!shouldLoop) onEnded();
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      removeSoundUnlockRef.current?.();
      removeSoundUnlockRef.current = null;
      stopAmbient();
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [
    videoId,
    onEnded,
    shouldLoop,
    useAmbientMusic,
    effectiveAmbientSrc,
    heroAudibleSpent,
    onHeroAudibleConsumed,
  ]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {posterSrc.trim() ? (
        <div className="absolute inset-0 z-0">
          <CmsRemoteImage
            src={posterSrc}
            alt={alt}
            fill
            priority
            quality={75}
            className="object-cover object-center"
            sizes="100vw"
            aria-hidden
          />
        </div>
      ) : null}
      <div
        ref={hostRef}
        className="absolute inset-0 z-[1] [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:min-h-full [&_iframe]:w-full [&_iframe]:min-w-full [&_iframe]:scale-[1.15]"
      />
      {effectiveAmbientSrc ? (
        <audio
          ref={audioRef}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          aria-hidden
          playsInline
          preload="auto"
        />
      ) : null}
    </div>
  );
}
