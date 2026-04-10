"use client";

import { useEffect, useRef } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { HeroYoutubeSlide } from "@/components/HeroYoutubeSlide";
import {
  addUnlockSoundOnFirstPointer,
  getHeroFallbackMusicSrc,
  HERO_AMBIENT_VOLUME,
  inferNativeVideoHasAudibleTrack,
} from "@/lib/hero-audio";
import type { HeroSlide } from "@/lib/hero-slides-default";
import { getYoutubeVideoId } from "@/lib/hero-video";

export function HeroSlideBackground({
  slide,
  slideKey,
  onVideoEnded,
  shouldLoopWhenSingleSlide,
  heroAudibleSpent,
  onHeroAudibleConsumed,
}: {
  slide: HeroSlide;
  slideKey: string;
  onVideoEnded: () => void;
  shouldLoopWhenSingleSlide: boolean;
  heroAudibleSpent: boolean;
  onHeroAudibleConsumed: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const vUrl = slide.videoUrl?.trim() ?? "";
  const ytId = vUrl ? getYoutubeVideoId(vUrl) : null;
  const ambientSrc = getHeroFallbackMusicSrc();

  useEffect(() => {
    if (!vUrl || ytId) return;
    const v = videoRef.current;
    if (!v) return;

    let removeUnlock: (() => void) | undefined;
    let cancelled = false;
    const detach: Array<() => void> = [];

    const stopAmbient = () => {
      const a = audioRef.current;
      if (!a) return;
      a.pause();
      a.removeAttribute("src");
      void a.load();
    };

    const run = () => {
      if (cancelled) return;

      if (heroAudibleSpent) {
        stopAmbient();
        v.muted = true;
        v.volume = 1;
        void v.play().catch(() => {
          removeUnlock = addUnlockSoundOnFirstPointer(() => {
            if (cancelled) return;
            v.muted = true;
            void v.play();
          });
        });
        return;
      }

      const inferred = inferNativeVideoHasAudibleTrack(v);
      const forceAmbient = slide.useAmbientMusic === true;
      const useAmbient =
        Boolean(ambientSrc) && (forceAmbient || inferred === "no-track");

      stopAmbient();

      if (forceAmbient && !ambientSrc) {
        v.muted = true;
        v.volume = 1;
        void v.play().catch(() => {
          removeUnlock = addUnlockSoundOnFirstPointer(() => void v.play());
        });
        return;
      }

      if (useAmbient && ambientSrc) {
        const a = audioRef.current;
        v.muted = true;
        v.volume = 1;
        if (a) {
          a.src = ambientSrc;
          a.loop = shouldLoopWhenSingleSlide;
          a.volume = HERO_AMBIENT_VOLUME;
          const onAmbientPlaying = () => {
            onHeroAudibleConsumed();
            a.removeEventListener("playing", onAmbientPlaying);
          };
          a.addEventListener("playing", onAmbientPlaying);
          detach.push(() => a.removeEventListener("playing", onAmbientPlaying));
        }

        const unlockAmbient = () => {
          if (cancelled) return;
          void v.play();
          if (audioRef.current) void audioRef.current.play();
        };

        void v.play().catch(() => {});
        if (a) {
          void a.play().catch(() => {
            removeUnlock = addUnlockSoundOnFirstPointer(unlockAmbient);
          });
        }
        return;
      }

      v.muted = false;
      v.volume = 1;
      const onVideoAudible = () => {
        if (!cancelled && !v.muted && v.volume > 0) {
          onHeroAudibleConsumed();
        }
        v.removeEventListener("playing", onVideoAudible);
      };
      v.addEventListener("playing", onVideoAudible);
      detach.push(() => v.removeEventListener("playing", onVideoAudible));

      const unlockVideo = () => {
        if (cancelled) return;
        v.muted = false;
        v.volume = 1;
        void v.play();
      };

      void v.play().catch(() => {
        v.muted = true;
        void v.play().catch(() => {});
        removeUnlock = addUnlockSoundOnFirstPointer(unlockVideo);
      });
    };

    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) {
      run();
    } else {
      v.addEventListener("loadedmetadata", run, { once: true });
    }

    return () => {
      cancelled = true;
      detach.forEach((d) => d());
      removeUnlock?.();
      v.removeEventListener("loadedmetadata", run);
      stopAmbient();
    };
  }, [
    slideKey,
    vUrl,
    ytId,
    ambientSrc,
    slide.useAmbientMusic,
    shouldLoopWhenSingleSlide,
    heroAudibleSpent,
    onHeroAudibleConsumed,
  ]);

  if (!vUrl) {
    return (
      <CmsRemoteImage
        src={slide.src}
        alt={slide.alt}
        fill
        priority
        quality={82}
        className="object-cover object-center"
        sizes="100vw"
      />
    );
  }

  if (ytId) {
    return (
      <HeroYoutubeSlide
        videoId={ytId}
        posterSrc={slide.src}
        alt={slide.alt}
        onEnded={onVideoEnded}
        shouldLoop={shouldLoopWhenSingleSlide}
        ambientMusicSrc={ambientSrc}
        useAmbientMusic={slide.useAmbientMusic === true}
        heroAudibleSpent={heroAudibleSpent}
        onHeroAudibleConsumed={onHeroAudibleConsumed}
      />
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        key={slideKey}
        className="absolute inset-0 h-full w-full object-cover object-center"
        poster={slide.src}
        src={vUrl}
        playsInline
        preload="auto"
        loop={shouldLoopWhenSingleSlide}
        onEnded={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
        onError={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
      />
      <audio
        ref={audioRef}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden
        playsInline
        preload="auto"
      />
    </>
  );
}
