"use client";

import { useEffect, useRef, useState } from "react";
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
 * YouTube hero: muted autoplay; sound follows `heroSoundEnabled` (user toggle).
 */
export function HeroYoutubeSlide({
  videoId,
  posterSrc,
  alt,
  onEnded,
  shouldLoop,
  ambientMusicSrc,
  useAmbientMusic,
  heroSoundEnabled,
}: {
  videoId: string;
  posterSrc: string;
  alt: string;
  onEnded: () => void;
  shouldLoop: boolean;
  ambientMusicSrc?: string;
  useAmbientMusic?: boolean;
  heroSoundEnabled: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const ytTargetRef = useRef<YTPlayerTarget | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

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

    setPlayerReady(false);
    ytTargetRef.current = null;

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
            if (cancelled) return;
            ytTargetRef.current = e.target;
            try {
              e.target.mute();
              e.target.playVideo();
            } catch {
              /* ignore */
            }
            const useBed = Boolean(useAmbientMusic && effectiveAmbientSrc);
            if (useBed) {
              const a = audioRef.current;
              if (a && effectiveAmbientSrc) {
                a.src = effectiveAmbientSrc;
                a.loop = shouldLoop;
                a.volume = HERO_AMBIENT_VOLUME;
              }
            }
            setPlayerReady(true);
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
      setPlayerReady(false);
      ytTargetRef.current = null;
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
  ]);

  useEffect(() => {
    if (!playerReady) return;
    const t = ytTargetRef.current;
    if (!t) return;

    if (useAmbientMusic && !effectiveAmbientSrc) {
      try {
        t.mute();
      } catch {
        /* ignore */
      }
      return;
    }

    const useBed = Boolean(useAmbientMusic && effectiveAmbientSrc);
    const a = audioRef.current;

    if (useBed && a && effectiveAmbientSrc) {
      try {
        t.mute();
      } catch {
        /* ignore */
      }
      if (!a.src) {
        a.src = effectiveAmbientSrc;
        a.loop = shouldLoop;
        a.volume = HERO_AMBIENT_VOLUME;
      }
      if (heroSoundEnabled) {
        void a.play().catch(() => {});
      } else {
        a.pause();
      }
      return;
    }

    if (heroSoundEnabled) {
      try {
        t.unMute();
        t.setVolume(100);
      } catch {
        /* ignore */
      }
    } else {
      try {
        t.mute();
      } catch {
        /* ignore */
      }
    }
  }, [
    playerReady,
    heroSoundEnabled,
    useAmbientMusic,
    effectiveAmbientSrc,
    shouldLoop,
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
      {useAmbientMusic && effectiveAmbientSrc ? (
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
