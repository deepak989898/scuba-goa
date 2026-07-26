import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Scuba Goa",
    description:
      "Book scuba diving and water sports in Goa — live prices, Razorpay checkout, WhatsApp support.",
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    // Matches generated PWA icon sky tile (see scripts/generate-pwa-icons.mjs)
    background_color: "#0ea5e9",
    theme_color: "#0ea5e9",
    lang: "en-IN",
    dir: "ltr",
    categories: ["travel", "lifestyle", "sports"],
    icons: [
      {
        src: "/icons/icon-192.png?v=5",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png?v=5",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
