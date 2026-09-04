"use client";

import { useState } from "react";
import Image from "next/image";
import { isRemoteUrlOptimizableByNext } from "@/lib/remote-image";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  /** Used when `fill` is false (natural / full-image layout). */
  width?: number;
  height?: number;
  /**
   * Show the full image at its intrinsic aspect ratio (no crop box).
   * Prefer for blog featured images / designed banners.
   */
  showFull?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  /** next/image quality 1–100; lower = smaller files (default 78) */
  quality?: number;
  onError?: () => void;
};

const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px";
const DEFAULT_QUALITY = 65;

function RawImg({
  src,
  alt,
  fill,
  width,
  height,
  showFull,
  className = "",
  priority,
  loading,
  onError,
}: Props) {
  const load = priority ? "eager" : loading ?? "lazy";
  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className}`.trim()}
        loading={load}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        referrerPolicy="no-referrer-when-downgrade"
        onError={onError}
      />
    );
  }
  if (showFull) {
    return (
      <img
        src={src}
        alt={alt}
        className={`h-auto w-full ${className}`.trim()}
        loading={load}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        referrerPolicy="no-referrer-when-downgrade"
        onError={onError}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={load}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      referrerPolicy="no-referrer-when-downgrade"
      onError={onError}
    />
  );
}

/**
 * CMS / catalog images — local public assets and remote Firebase URLs.
 * Falls back to a native `<img>` if next/image fails (e.g. optimizer outage).
 */
export function CmsRemoteImage(props: Props) {
  const {
    src,
    alt,
    fill,
    width,
    height,
    showFull,
    className = "",
    sizes,
    priority,
    loading,
    quality = DEFAULT_QUALITY,
    onError,
  } = props;

  const trimmed = src?.trim() ?? "";
  const [forceRaw, setForceRaw] = useState(false);

  if (!trimmed) {
    const box = fill
      ? `absolute inset-0 bg-ocean-100 ${className}`.trim()
      : `bg-ocean-100 ${className}`.trim();
    return <div className={box} aria-hidden />;
  }

  const handleError = () => {
    if (!forceRaw) setForceRaw(true);
    onError?.();
  };

  if (forceRaw) {
    return <RawImg {...props} src={trimmed} onError={onError} />;
  }

  // Full intrinsic display — never crop designed banners / featured images.
  if (showFull && !fill) {
    return <RawImg {...props} src={trimmed} onError={onError} />;
  }

  const isLocalPublic = trimmed.startsWith("/");
  const useNext =
    !forceRaw &&
    (isLocalPublic || isRemoteUrlOptimizableByNext(trimmed));

  if (!useNext) {
    return <RawImg {...props} src={trimmed} onError={onError} />;
  }

  if (fill) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        fill
        unoptimized
        className={className}
        sizes={sizes ?? DEFAULT_SIZES}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        quality={quality}
        loading={priority ? undefined : loading ?? "lazy"}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={trimmed}
      alt={alt}
      width={width ?? 1600}
      height={height ?? 900}
      unoptimized
      className={className}
      sizes={sizes ?? DEFAULT_SIZES}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      quality={quality}
      loading={priority ? undefined : loading ?? "lazy"}
      style={{ width: "100%", height: "auto" }}
      onError={handleError}
    />
  );
}
