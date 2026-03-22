/**
 * Seed Firestore packages (Node 18+).
 * Usage:
 *   set FIREBASE_SERVICE_ACCOUNT_KEY to your service account JSON string
 *   node scripts/seed-firestore.mjs
 */
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) {
  console.error("Set FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

const cred = JSON.parse(raw);
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: cred.project_id,
      clientEmail: cred.client_email,
      privateKey: cred.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

const packages = [
  {
    name: "Grande Island Try Dive + Photos",
    price: 3499,
    duration: "4–5 hrs",
    includes: ["Boat transfer", "Gear", "Instructor", "Underwater photos"],
    rating: 4.9,
    slotsLeft: 6,
    bookedToday: 14,
    limitedSlots: true,
    category: "Scuba",
    imageUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "North Goa Highlights (Private Cab)",
    price: 2499,
    duration: "8 hrs",
    includes: ["Hotel pickup", "AC cab", "Flexible stops", "Bottled water"],
    rating: 4.8,
    slotsLeft: 4,
    bookedToday: 9,
    limitedSlots: true,
    category: "Tours",
    imageUrl:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Casino Cruise Entry + Dinner",
    price: 3500,
    duration: "Evening",
    includes: ["Entry package", "Buffet", "Entertainment zone"],
    rating: 4.6,
    slotsLeft: 12,
    bookedToday: 5,
    limitedSlots: false,
    category: "Nightlife",
    imageUrl:
      "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Night Club VIP Table",
    price: 4999,
    duration: "Night",
    includes: ["Guest list", "Table", "Mixers"],
    rating: 4.7,
    slotsLeft: 3,
    bookedToday: 6,
    limitedSlots: true,
    category: "Nightlife",
    imageUrl:
      "https://images.unsplash.com/photo-1571266028243-e4736f2e9f4a?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Flyboard Session",
    price: 3799,
    duration: "45 min",
    includes: ["Trainer", "Gear", "Safety briefing"],
    rating: 4.8,
    slotsLeft: 3,
    bookedToday: 4,
    limitedSlots: true,
    category: "Adventure",
    imageUrl:
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Bungee Jump (Certified)",
    price: 3999,
    duration: "1 hr",
    includes: ["Jump", "Certificate", "Photos add-on"],
    rating: 4.9,
    slotsLeft: 5,
    bookedToday: 2,
    limitedSlots: true,
    category: "Adventure",
    imageUrl:
      "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=75",
  },
  {
    name: "Scuba + Water Sports Combo",
    price: 4999,
    duration: "6–7 hrs",
    includes: ["Try dive", "Jet ski OR parasail", "Lunch", "Transfers"],
    rating: 5,
    slotsLeft: 5,
    bookedToday: 7,
    isCombo: true,
    discountPct: 18,
    limitedSlots: true,
    category: "Combo",
    imageUrl:
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=900&q=75",
  },
];

async function main() {
  const batch = db.batch();
  const col = db.collection("packages");
  for (const p of packages) {
    const ref = col.doc();
    batch.set(ref, { ...p, active: true });
  }
  await batch.commit();
  console.log("Seeded", packages.length, "packages");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
