/** Shown with Firestore guest reviews on the homepage. */
export type DemoTestimonial = {
  id: string;
  authorName: string;
  place: string;
  comment: string;
  rating: number;
  img: string;
};

export const DEMO_TESTIMONIALS: DemoTestimonial[] = [
  {
    id: "demo-priya",
    authorName: "Priya S.",
    place: "Bangalore",
    comment:
      "Seamless scuba slot + video. Crew was calm, professional—felt like a premium operator.",
    rating: 5,
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75",
  },
  {
    id: "demo-rahul",
    authorName: "Rahul M.",
    place: "Mumbai",
    comment:
      "Combo with water sports saved us half a day of haggling on the beach.",
    rating: 5,
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=75",
  },
  {
    id: "demo-emily",
    authorName: "Emily T.",
    place: "UK",
    comment:
      "Clear WhatsApp updates, on-time pickup, and transparent pricing—rare in Goa.",
    rating: 5,
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=75",
  },
];
