"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const gallery = [
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=75",
  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=75",
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=75",
  "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=75",
  "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=75",
  "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=75",
];

export function GallerySection() {
  const [active, setActive] = useState(0);

  return (
    <section className="bg-sand py-16 sm:py-20" id="gallery">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Gallery & moments
        </h2>
        <p className="mt-2 text-ocean-700">
          Lazy-loaded grid + tap-to-preview—swap with your Cloudinary or Firebase
          Storage URLs anytime.
        </p>
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
                <Image
                  src={gallery[active]!}
                  alt="Goa experience"
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 66vw"
                  loading="lazy"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-4 left-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
              Video-style stories coming soon
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
            {gallery.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                className={`relative aspect-square overflow-hidden rounded-xl ring-2 ring-transparent transition ${
                  active === i ? "ring-ocean-500" : "hover:ring-ocean-200"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="150px"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
