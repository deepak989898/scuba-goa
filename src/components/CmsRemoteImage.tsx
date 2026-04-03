/* eslint-disable @next/next/no-img-element -- unknown external hosts cannot use next/image */
import Image from "next/image";
import { isRemoteUrlOptimizableByNext } from "@/lib/remote-image";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  /** next/image quality 1–100; lower = smaller files (default 78) */
  quality?: number;
};

const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px";
const DEFAULT_QUALITY = 78;

/**
 * Local `/` assets and known CDN hosts use next/image (compression + modern formats).
 * Other https URLs fall back to `<img>` with lazy loading + async decode.
 */
export function CmsRemoteImage({
  src,
  alt,
  fill,
  className = "",
  sizes,
  priority,
  loading,
  quality = DEFAULT_QUALITY,
}: Props) {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) {
    const box = fill
      ? `absolute inset-0 bg-ocean-100 ${className}`.trim()
      : `bg-ocean-100 ${className}`.trim();
    return <div className={box} aria-hidden />;
  }

  const isLocalPublic = trimmed.startsWith("/");
  const useNext =
    isLocalPublic || isRemoteUrlOptimizableByNext(trimmed);

  if (useNext) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        fill={fill}
        className={className}
        sizes={sizes ?? DEFAULT_SIZES}
        priority={priority}
        quality={quality}
        loading={priority ? undefined : loading ?? "lazy"}
      />
    );
  }

  if (fill) {
    return (
      <img
        src={trimmed}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover ${className}`.trim()}
        loading={priority ? "eager" : loading ?? "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <img
      src={trimmed}
      alt={alt}
      className={className}
      loading={priority ? "eager" : loading ?? "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
