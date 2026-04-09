"use client";

import { useEffect, useRef } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { loadYoutubeIframeApi } from "@/lib/load-youtube-iframe-api";

type YTPlayerInstance = { destroy: () => void };

/**
 * Background YouTube player (muted autoplay). Fires `onEnded` when the video ends,
 * unless `shouldLoop` is true (single-slide hero).
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
          onReady: (e: {
            target: { playVideo: () => void; mute: () => void };
          }) => {
            try {
              e.target.mute();
              e.target.playVideo();
            } catch {
              /* ignore */
            }
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
