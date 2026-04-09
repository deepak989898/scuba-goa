/** `src` is always the image URL (also used as video poster when `videoUrl` is set). */
export type HeroSlide = { src: string; alt: string; videoUrl?: string };

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    src: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1920&q=80",
    alt: "Scuba diving in clear water",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    alt: "Goa beach coastline",
  },
  {
    src: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1920&q=80",
    alt: "Water sports at sea",
  },
];
