"use client";

import { useCallback, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";

type Props = {
  src: string;
  fallbackSrc: string;
  alt: string;
  showFull?: boolean;
  className?: string;
  priority?: boolean;
};

/**
 * Blog hero with automatic fallback when the primary URL is missing or fails to load.
 */
export function BlogFeaturedImage({
  src,
  fallbackSrc,
  alt,
  showFull = true,
  className = "",
  priority,
}: Props) {
  const primary = src?.trim() || "";
  const fallback = fallbackSrc?.trim() || "";
  const [activeSrc, setActiveSrc] = useState(primary || fallback);

  const handleError = useCallback(() => {
    if (fallback && activeSrc !== fallback) {
      setActiveSrc(fallback);
    }
  }, [fallback, activeSrc]);

  if (!activeSrc) return null;

  return (
    <figure className="mt-1.5 w-full overflow-hidden rounded-md border border-ocean-100">
      <CmsRemoteImage
        src={activeSrc}
        alt={alt}
        showFull={showFull}
        className={className || "block h-auto w-full"}
        priority={priority}
        onError={handleError}
      />
    </figure>
  );
}
