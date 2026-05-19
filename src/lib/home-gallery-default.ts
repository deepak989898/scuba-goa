import type { GalleryCategoryId } from "@/lib/gallery-categories";

export type HomeGalleryItem = {
  type: "image" | "video";
  mediaUrl: string;
  posterUrl?: string;
  alt: string;
  category?: GalleryCategoryId;
  source?: string;
  sourceSlug?: string;
};

/** Used when Firestore `homeGallery` is empty or unavailable. */
export const DEFAULT_HOME_GALLERY: HomeGalleryItem[] = [
  {
    type: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1024&q=65",
    alt: "Underwater scene",
    category: "underwater",
  },
  {
    type: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1024&q=65",
    alt: "Diver",
    category: "underwater",
  },
  {
    type: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1024&q=65",
    alt: "Ocean",
    category: "underwater",
  },
  {
    type: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1024&q=65",
    alt: "Beach",
    category: "underwater",
  },
  {
    type: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1024&q=65",
    alt: "Surf",
    category: "reels",
  },
  {
    type: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1024&q=65",
    alt: "Water sports",
    category: "packages",
  },
];
