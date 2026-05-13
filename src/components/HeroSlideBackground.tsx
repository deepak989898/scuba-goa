"use client";

import { useEffect, useRef } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { HeroYoutubeSlide } from "@/components/HeroYoutubeSlide";
import { useShouldRenderHeroVideo } from "@/hooks/useShouldRenderHeroVideo";
import {
  getHeroFallbackMusicSrc,
  HERO_AMBIENT_VOLUME,
  inferNativeVideoHasAudibleTrack,
} from "@/lib/hero-audio";
import { getHeroVideoPosterSrc, type HeroSlide } from "@/lib/hero-slides-default";
import { getYoutubeVideoId } from "@/lib/hero-video";

export function HeroSlideBackground({
  slide,
  slideKey,
  onVideoEnded,
  shouldLoopWhenSingleSlide,
  heroSoundEnabled,
}: {
  slide: HeroSlide;
  slideKey: string;
  onVideoEnded: () => void;
  shouldLoopWhenSingleSlide: boolean;
  /** User toggle: when false, hero video (and site music) stay muted. */
  heroSoundEnabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const vUrl = slide.videoUrl?.trim() ?? "";
  const ytId = vUrl ? getYoutubeVideoId(vUrl) : null;
  const ambientSrc = getHeroFallbackMusicSrc();
  const videoPosterSrc = getHeroVideoPosterSrc(slide);
  const shouldRenderVideo = useShouldRenderHeroVideo();

  useEffect(() => {
    if (!vUrl || ytId || !shouldRenderVideo) return;
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;

    const stopAmbient = () => {
      const a = audioRef.current;
      if (!a) return;
      a.pause();
      a.removeAttribute("src");
      void a.load();
    };

    const run = () => {
      if (cancelled) return;
      const inferred = inferNativeVideoHasAudibleTrack(v);
      const forceAmbient = slide.useAmbientMusic === true;
      const useAmbient =
        Boolean(ambientSrc) && (forceAmbient || inferred === "no-track");

      stopAmbient();

      if (forceAmbient && !ambientSrc) {
        v.muted = true;
        v.volume = 1;
        void v.play().catch(() => {});
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
        }
        void v.play().catch(() => {});
        if (heroSoundEnabled && a) {
          void a.play().catch(() => {});
        } else if (a) {
          a.pause();
        }
        return;
      }

      v.volume = 1;
      v.muted = !heroSoundEnabled;
      void v.play().catch(() => {
        v.muted = true;
        void v.play().catch(() => {});
      });
    };

    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) {
      run();
    } else {
      v.addEventListener("loadedmetadata", run, { once: true });
    }

    return () => {
      cancelled = true;
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
    heroSoundEnabled,
    shouldRenderVideo,
  ]);

  if (!vUrl || !shouldRenderVideo) {
    return (
      <CmsRemoteImage
        src={videoPosterSrc || slide.src}
        alt={slide.alt}
        fill
        priority
        quality={68}
        className="object-cover object-center"
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1600px"
      />
    );
  }

  if (ytId) {
    return (
      <HeroYoutubeSlide
        videoId={ytId}
        posterSrc={videoPosterSrc}
        alt={slide.alt}
        onEnded={onVideoEnded}
        shouldLoop={shouldLoopWhenSingleSlide}
        ambientMusicSrc={ambientSrc}
        useAmbientMusic={slide.useAmbientMusic === true}
        heroSoundEnabled={heroSoundEnabled}
      />
    );
  }

  return (
    <>
      {/*
        iOS Safari and most Android browsers only honor autoplay when the
        video element carries `autoplay muted playsinline` declaratively. The
        effect above still drives audio behaviour when the user enables sound;
        the declarative `muted` keeps the initial load mobile-autoplay-safe.

        `preload="metadata"` (instead of "auto") avoids fetching the full clip
        on every page load — the browser only pulls enough bytes to start
        playback, and the poster image keeps the hero visible until then.
      */}
      <video
        ref={videoRef}
        key={slideKey}
        className="absolute inset-0 h-full w-full object-cover object-center"
        poster={videoPosterSrc}
        src={vUrl}
        autoPlay
        muted
        playsInline
        preload="metadata"
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
