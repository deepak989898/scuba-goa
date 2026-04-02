"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { useHomeGallery } from "@/hooks/useHomeGallery";
import type { HomeGalleryItem } from "@/lib/home-gallery-default";

/** Helps some browsers show a first frame with preload="metadata" only */
function videoSrcForThumbnailFrame(url: string) {
  const t = url.trim();
  if (!t || t.includes("#")) return t;
  return `${t}#t=0.001`;
}

/** When admin did not set posterUrl, show a frame from the video file */
function AutoVideoThumbnail({ src, label }: { src: string; label: string }) {
  return (
    <video
      src={videoSrcForThumbnailFrame(src)}
      muted
      playsInline
      preload="metadata"
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      aria-hidden
      title={label}
    />
  );
}

function Thumbnail({
  item,
  active,
  onSelect,
}: {
  item: HomeGalleryItem;
  active: boolean;
  onSelect: () => void;
}) {
  const isVideo = item.type === "video";
  const adminPoster = isVideo ? item.posterUrl?.trim() : "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative aspect-square overflow-hidden rounded-xl ring-2 ring-transparent transition ${
        active ? "ring-ocean-500" : "hover:ring-ocean-200"
      }`}
    >
      {!isVideo ? (
        <CmsRemoteImage
          src={item.mediaUrl}
          alt={item.alt}
          fill
          className="object-cover"
          sizes="150px"
          loading="lazy"
        />
      ) : adminPoster ? (
        <CmsRemoteImage
          src={adminPoster}
          alt={item.alt}
          fill
          className="object-cover"
          sizes="150px"
          loading="lazy"
        />
      ) : (
        <>
          <AutoVideoThumbnail src={item.mediaUrl} label={item.alt} />
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 text-white"
            aria-hidden
          >
            <span className="text-2xl drop-shadow-md">▶</span>
          </div>
        </>
      )}
      {isVideo ? (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          Reel
        </span>
      ) : null}
    </button>
  );
}

export function GallerySection() {
  const { items, loading } = useHomeGallery();
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive((i) => (items.length ? Math.min(i, items.length - 1) : 0));
  }, [items.length]);

  const current = items[active];
  const mainVideoPoster = current?.type === "video" ? current.posterUrl?.trim() : "";
  const mainVideoSrc =
    current?.type === "video"
      ? mainVideoPoster
        ? current.mediaUrl.trim()
        : videoSrcForThumbnailFrame(current.mediaUrl)
      : "";

  return (
    <section className="bg-sand py-16 sm:py-20" id="gallery">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold text-ocean-900 sm:text-3xl lg:text-4xl">
          Gallery & moments
        </h2>
        <p className="mt-1.5 text-sm text-ocean-700 sm:mt-2 sm:text-base">
          Photos and short reels from trips — curated from the admin panel.
        </p>
        {loading ? (
          <p className="mt-8 text-sm text-ocean-600">Loading gallery…</p>
        ) : !current ? (
          <p className="mt-8 text-sm text-ocean-600">No gallery items yet.</p>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ocean-100 lg:col-span-2 lg:aspect-auto lg:min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  {current.type === "video" ? (
                    <div
                      className="absolute inset-0"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <video
                        key={`${current.mediaUrl}-${mainVideoPoster || "auto-thumb"}`}
                        className="h-full w-full object-cover"
                        src={mainVideoSrc}
                        poster={mainVideoPoster || undefined}
                        controls
                        controlsList="nodownload"
                        disablePictureInPicture
                        playsInline
                        preload="metadata"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {current.alt}
                      </video>
                    </div>
                  ) : (
                    <CmsRemoteImage
                      src={current.mediaUrl}
                      alt={current.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width:1024px) 100vw, 66vw"
                      loading="lazy"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
              {items.map((item, i) => (
                <Thumbnail
                  key={`${item.mediaUrl}-${i}`}
                  item={item}
                  active={active === i}
                  onSelect={() => setActive(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
