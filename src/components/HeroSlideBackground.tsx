"use client";

import { useEffect, useRef, useState } from "react";
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

function heroMediaSafe(url: string | undefined | null): string {
  const t = String(url ?? "").trim();
  if (!t || t.includes("booking-header")) return "";
  return t;
}

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
  const [videoReady, setVideoReady] = useState(false);
  const vUrl = slide.videoUrl?.trim() ?? "";
  const ytId = vUrl ? getYoutubeVideoId(vUrl) : null;
  const ambientSrc = getHeroFallbackMusicSrc();
  const videoPosterSrc = getHeroVideoPosterSrc(slide);
  const shouldRenderVideo = useShouldRenderHeroVideo();

  useEffect(() => {
    setVideoReady(false);
  }, [slideKey, shouldRenderVideo]);

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

  const posterSrc = videoPosterSrc || heroMediaSafe(slide.src);

  // Poster first for LCP; empty src → solid ocean (never booking-header flash).
  const poster = posterSrc ? (
    <CmsRemoteImage
      src={posterSrc}
      alt={slide.alt}
      fill
      priority
      quality={65}
      className="object-cover object-center"
      sizes="100vw"
    />
  ) : (
    <div className="absolute inset-0 bg-ocean-900" aria-hidden />
  );

  if (!vUrl || !shouldRenderVideo) {
    return poster;
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
      {poster}
      {/*
        Video sits above the optimized poster only after it can paint a frame.
        That keeps LCP on AVIF/WebP via next/image instead of a huge raw poster.
      */}
      <video
        ref={videoRef}
        key={slideKey}
        className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        poster={videoPosterSrc}
        src={vUrl}
        autoPlay
        muted
        playsInline
        preload="metadata"
        loop={shouldLoopWhenSingleSlide}
        onLoadedData={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        onEnded={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
        onError={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
      />
      <audio
        ref={audioRef}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden
        playsInline
        preload="none"
      />
    </>
  );
}
