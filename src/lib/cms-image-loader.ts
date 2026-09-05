import { buildOptimizedImageUrl, clampImageQuality, clampImageWidth } from "@/lib/image-optimize";

type LoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

/** Custom next/image loader — routes through `/api/image` instead of `/_next/image`. */
export default function cmsImageLoader({ src, width, quality }: LoaderProps): string {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) return "";
  return buildOptimizedImageUrl(
    trimmed,
    clampImageWidth(width),
    clampImageQuality(quality ?? 75),
  );
}
