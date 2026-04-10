"use client";

import { useEffect, useRef } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { loadYoutubeIframeApi } from "@/lib/load-youtube-iframe-api";

type YTPlayerInstance = { destroy: () => void };

type YTPlayerTarget = {
  mute: () => void;
  unMute: () => void;
  setVolume: (n: number) => void;
  playVideo: () => void;
};

/**
 * YouTube hero background: muted autoplay first (policy-friendly), then unmutes on the
 * user’s first tap/click anywhere. Fires `onEnded` when the video ends unless `shouldLoop`.
 */
export function HeroYoutubeSlide({
  videoId,
  posterSrc,
  alt,
  onEnded,
  shouldLoop,
}: {
  videoId: string;
  posterSrc: string;
  alt: string;
  onEnded: () => void;
  shouldLoop: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const removeSoundUnlockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    const mountEl = hostRef.current;
    if (!mountEl) return;

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

      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      removeSoundUnlockRef.current?.();
      removeSoundUnlockRef.current = null;

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

      const player = new YT.Player(hostRef.current, {
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
            const unlock = () => {
              try {
                e.target.unMute();
                e.target.setVolume(100);
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
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId, onEnded, shouldLoop]);

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
    </div>
  );
}
