/* eslint-disable @next/next/no-img-element -- arbitrary admin URLs skip next/image remotePatterns */
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
};

/**
 * Admin/Firestore image URLs can be any https host. next/image only allows
 * hosts in next.config `remotePatterns`, so we use a plain <img> for remote URLs.
 */
export function CmsRemoteImage({
  src,
  alt,
  fill,
  className = "",
  sizes,
  priority,
  loading,
}: Props) {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) {
    const box = fill
      ? `absolute inset-0 bg-ocean-100 ${className}`.trim()
      : `bg-ocean-100 ${className}`.trim();
    return <div className={box} aria-hidden />;
  }

  const isLocalPublic = trimmed.startsWith("/");

  if (isLocalPublic) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        fill={fill}
        className={className}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : loading}
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
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
