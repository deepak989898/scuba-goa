import type { ReactNode } from "react";
import type { SocialPlatform } from "@/lib/social-media/types";

type Props = {
  platform: SocialPlatform | string;
  size?: number;
  className?: string;
};

const SIZE_DEFAULT = 22;

function IconShell({
  size,
  className,
  children,
  label,
}: {
  size: number;
  className?: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

function GoogleBusinessIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="#4285F4"
        d="M12 11.5v3.5h4.9c-.2 1.1-1.5 3.3-4.9 3.3-3 0-5.4-2.5-5.4-5.6S8.9 7.1 12 7.1c1.7 0 2.8.7 3.5 1.3l2.4-2.3C16.5 4.8 14.5 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.6-3.2 7.6-7.8 0-.5-.1-1-.2-1.2H12z"
      />
      <path fill="#34A853" d="M4 8.5l3.3 2.6C8.2 9 9.9 8 12 8c1.1 0 2.1.3 2.9.8l2.7-2.6C15.8 4.9 14 4 12 4 8.1 4 4.9 6.8 4 8.5z" />
      <path fill="#FBBC05" d="M4 15.5c-.7-1.3-1-2.7-1-4s.3-2.7 1-4l3.3 2.6C6.8 11.5 6.5 12.7 6.5 14s.3 2.5 1.8 3.9L4 15.5z" />
      <path fill="#EA4335" d="M12 20c2.2 0 4.1-.7 5.5-2l-2.7-2.6c-.8.5-1.8.9-2.8.9-2.2 0-4-1.5-4.6-3.5L4 15.5C5.4 18.5 8.4 20 12 20z" />
    </svg>
  );
}

function FacebookIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M15.5 12.5h-2.2v7.5h-3V12.5H8.5V9.8h2.3V7.8c0-2.2 1.3-3.4 3.3-3.4.9 0 1.9.2 1.9.2v2.1h-1.1c-1.1 0-1.4.7-1.4 1.4v1.7h2.4l-.4 2.7z"
      />
    </svg>
  );
}

function InstagramIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#E4405F" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="#fff" />
    </svg>
  );
}

function YouTubeIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#FF0000" />
      <path fill="#fff" d="M17.5 12 9.5 7.5v9L17.5 12z" />
    </svg>
  );
}

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.2 14.9c-.3-.1-1.6-.8-1.8-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 .1-.1-.1-.4-.7-1.4-.2-.4-.1-.7.1-1 .1-.2.1-.4 0-.5-.1-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3 4.8 4.1.7.3 1.2.4 1.6.3.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.6-.3z"
      />
      <path
        fill="#fff"
        fillOpacity="0.9"
        d="M12 4a8 8 0 0 0-6.9 12l-.4 1.5 1.5-.4A8 8 0 1 0 12 4zm0 14.5a6.5 6.5 0 0 1-3.3-.9l-.2-.1-.9.2.2-.9-.1-.2a6.5 6.5 0 1 1 4.3 1.9z"
      />
    </svg>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  googleBusiness: "Google Business",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

export function socialPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function SocialPlatformIcon({ platform, size = SIZE_DEFAULT, className }: Props) {
  const label = socialPlatformLabel(platform);
  const inner = (() => {
    switch (platform) {
      case "googleBusiness":
        return <GoogleBusinessIcon size={size} />;
      case "facebook":
        return <FacebookIcon size={size} />;
      case "instagram":
        return <InstagramIcon size={size} />;
      case "youtube":
        return <YouTubeIcon size={size} />;
      case "whatsapp":
        return <WhatsAppIcon size={size} />;
      default:
        return (
          <span
            className="flex items-center justify-center rounded bg-ocean-200 text-[10px] font-bold text-ocean-800"
            style={{ width: size, height: size }}
          >
            ?
          </span>
        );
    }
  })();

  return (
    <IconShell size={size} className={className} label={label}>
      {inner}
    </IconShell>
  );
}
