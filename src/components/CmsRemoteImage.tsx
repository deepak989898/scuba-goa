/* eslint-disable @next/next/no-img-element -- unknown external hosts cannot use next/image */
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
// 65 keeps photos visually crisp once Next.js re-encodes to AVIF/WebP while
// shaving ~30-40% off vs. the previous 78. Hero/poster usage can override.
const DEFAULT_QUALITY = 65;

/**
 * Local `/` assets and known CDN hosts use next/image (compression + modern formats).
 * Other https URLs fall back to `<img>` with lazy loading + async decode.
 */
export function CmsRemoteImage({
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
}: Props) {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) {
    const box = fill
      ? `absolute inset-0 bg-ocean-100 ${className}`.trim()
      : `bg-ocean-100 ${className}`.trim();
    return <div className={box} aria-hidden />;
  }

  // Full intrinsic display — never crop designed banners / featured images.
  if (showFull && !fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- need true intrinsic aspect ratio
      <img
        src={trimmed}
        alt={alt}
        className={`h-auto w-full ${className}`.trim()}
        loading={priority ? "eager" : loading ?? "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        referrerPolicy="no-referrer-when-downgrade"
        onError={onError}
      />
    );
  }

  const isLocalPublic = trimmed.startsWith("/");
  const useNext =
    isLocalPublic || isRemoteUrlOptimizableByNext(trimmed);

  if (useNext) {
    if (fill) {
      return (
        <Image
          src={trimmed}
          alt={alt}
          fill
          className={className}
          sizes={sizes ?? DEFAULT_SIZES}
          priority={priority}
          fetchPriority={priority ? "high" : undefined}
          quality={quality}
          loading={priority ? undefined : loading ?? "lazy"}
          onError={onError}
        />
      );
    }
    return (
      <Image
        src={trimmed}
        alt={alt}
        width={width ?? 1600}
        height={height ?? 900}
        className={className}
        sizes={sizes ?? DEFAULT_SIZES}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        quality={quality}
        loading={priority ? undefined : loading ?? "lazy"}
        style={{ width: "100%", height: "auto" }}
        onError={onError}
      />
    );
  }

  if (fill) {
    return (
      <img
        src={trimmed}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className}`.trim()}
        loading={priority ? "eager" : loading ?? "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        referrerPolicy="no-referrer-when-downgrade"
        onError={onError}
      />
    );
  }

  return (
    <img
      src={trimmed}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? "eager" : loading ?? "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      referrerPolicy="no-referrer-when-downgrade"
      onError={onError}
    />
  );
}
