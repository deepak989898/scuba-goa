"use client";

import { useEffect, useRef } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { HeroYoutubeSlide } from "@/components/HeroYoutubeSlide";
import type { HeroSlide } from "@/lib/hero-slides-default";
import { getYoutubeVideoId } from "@/lib/hero-video";

function addUnlockSoundOnFirstPointer(unlock: () => void) {
  const onPointer = () => {
    unlock();
    window.removeEventListener("pointerdown", onPointer, true);
  };
  window.addEventListener("pointerdown", onPointer, { capture: true, once: true });
  return () => window.removeEventListener("pointerdown", onPointer, true);
}

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

    let removeUnlock: (() => void) | undefined;

    const tryPlayWithSound = async () => {
      v.muted = false;
      v.volume = 1;
      try {
        await v.play();
      } catch {
        v.muted = true;
        try {
          await v.play();
        } catch {
          /* still blocked */
        }
        removeUnlock = addUnlockSoundOnFirstPointer(() => {
          v.muted = false;
          v.volume = 1;
          void v.play();
        });
      }
    };

    void tryPlayWithSound();

    return () => {
      removeUnlock?.();
    };
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
      playsInline
      preload="auto"
      loop={shouldLoopWhenSingleSlide}
      onEnded={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
      onError={shouldLoopWhenSingleSlide ? undefined : onVideoEnded}
    />
  );
}
