"use client";

import { useEffect, useRef } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { HeroYoutubeSlide } from "@/components/HeroYoutubeSlide";
import type { HeroSlide } from "@/lib/hero-slides-default";
import { getYoutubeVideoId } from "@/lib/hero-video";

export function HeroSlideBackground({
  slide,
  slideKey,
  onVideoEnded,
  shouldLoopWhenSingleSlide,
}: {
  slide: HeroSlide;
  slideKey: string;
  onVideoEnded: () => void;
  shouldLoopWhenSingleSlide: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const vUrl = slide.videoUrl?.trim() ?? "";
  const ytId = vUrl ? getYoutubeVideoId(vUrl) : null;

  useEffect(() => {
    if (!vUrl || ytId) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    void p?.catch(() => {
      /* autoplay may be blocked until gesture; muted usually succeeds */
    });
  }, [slideKey, vUrl, ytId]);

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
      />
    );
  }

  return (
    <video
      ref={videoRef}
      key={slideKey}
      className="absolute inset-0 h-full w-full object-cover object-center"
      poster={slide.src}
      src={vUrl}
      autoPlay
      muted
      playsInline
      preload="auto"
      loop={shouldLoopWhenSingleSlide}
      onEnded={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
      onError={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
    />
  );
}
