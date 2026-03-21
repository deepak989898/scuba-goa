export type ServiceItem = {
  slug: string;
  title: string;
  short: string;
  priceFrom: number;
  image: string;
  mostBooked?: boolean;
};

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=75`;

export const services: ServiceItem[] = [
  {
    slug: "scuba-diving",
    title: "Scuba Diving",
    short: "PADI-style dives, gear & guides",
    priceFrom: 2499,
    image: u("photo-1544551763-46a013bb70d5"),
    mostBooked: true,
  },
  {
    slug: "north-goa-tour",
    title: "North Goa Tour",
    short: "Beaches, forts & vibes",
    priceFrom: 1499,
    image: u("photo-1512343879784-a960bf40e7f2"),
    mostBooked: true,
  },
  {
    slug: "south-goa-tour",
    title: "South Goa Tour",
    short: "Quiet shores & heritage",
    priceFrom: 1699,
    image: u("photo-1507525428034-b723cf961d3e"),
  },
  {
    slug: "dudhsagar-trip",
    title: "Dudhsagar Trip",
    short: "Jeep safari & falls",
    priceFrom: 1899,
    image: u("photo-1432405972618-c60b0225b8f9"),
    mostBooked: true,
  },
  {
    slug: "water-sports",
    title: "Water Sports",
    short: "Jet ski, parasail & more",
    priceFrom: 999,
    image: u("photo-1530549387789-4c1017266635"),
  },
  {
    slug: "dolphin-trip",
    title: "Dolphin Trip",
    short: "Sunrise cruise & sightings",
    priceFrom: 599,
    image: u("photo-1568430462989-d4fbfabde15a"),
  },
  {
    slug: "casino-bookings",
    title: "Casino Bookings",
    short: "Offshore & onshore entry",
    priceFrom: 2500,
    image: u("photo-1596838132731-3301c3fd4317"),
  },
  {
    slug: "night-club",
    title: "Night Club",
    short: "VIP tables & guest lists",
    priceFrom: 1999,
    image: u("photo-1571266028243-e4736f2e9f4a"),
  },
  {
    slug: "pubs",
    title: "Pubs",
    short: "Curated pub crawls",
    priceFrom: 799,
    image: u("photo-1514933651103-005eec06c04b"),
  },
  {
    slug: "disco",
    title: "Disco",
    short: "Late-night dance floors",
    priceFrom: 1299,
    image: u("photo-1470225620780-dba8ba36b745"),
  },
  {
    slug: "flyboarding",
    title: "Flyboarding",
    short: "Thrill over the Arabian Sea",
    priceFrom: 3499,
    image: u("photo-1502680390469-be75c86b636f"),
  },
  {
    slug: "bungee-jumping",
    title: "Bungee Jumping",
    short: "Certified operators",
    priceFrom: 3999,
    image: u("photo-1522163182402-834f871fd851"),
  },
];
