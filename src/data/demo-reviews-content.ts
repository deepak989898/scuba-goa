/** Demo review copy — ~80% Hinglish, ~20% English, casual human tone. */

export const HINGLISH_REVIEW_TEMPLATES: string[] = [
  "Bohot hi acha experience tha yaar! {service} pehli baar try kiya aur staff ne poora guide kiya. Pickup bhi time pe aa gaya.",
  "Goa trip ka best part yahi tha. {service} bilkul smooth tha, price bhi reasonable laga hume.",
  "Honestly nervous the hum log, but instructor ne step-by-step samjhaya. End me full enjoy kiya — recommend karunga.",
  "WhatsApp pe clear reply mila, koi last minute drama nahi. {service} well organized tha, family ke saath gaye the.",
  "Staff friendly tha aur gear clean laga. {service} ka timing perfect tha, extra wait nahi karna pada.",
  "Humne {service} book kiya aur sach me worth it tha. Photos bhi ache mile, memories ban gayi.",
  "Pickup hotel se on time aaya, driver bhi polite tha. {service} me maza aa gaya, next year bhi aayenge Goa.",
  "Price transparent thi, hidden charge nahi liya. {service} experience genuine laga, tourist trap feel nahi aaya.",
  "Guide bahut patient tha, beginners ke liye perfect. {service} safe laga throughout.",
  "Ek dum professional team. {service} se pehle briefing clear thi, underwater me bhi calm feel hua.",
  "Friends ke saath plan tha, sabko {service} pasand aaya. Booking process easy tha website pe.",
  "Pehle doubt tha online book karne me, but sab smooth ho gaya. {service} time pe start hua.",
  "Crew ne help kiya life jacket se leke last tak. {service} highlight reh gaya trip ka.",
  "Thoda late start hua weather ki wajah se, but team ne adjust kar diya. {service} still amazing tha.",
  "Hum Delhi se aaye the, {service} ke liye alag se day rakha — bilkul sahi decision tha.",
  "Kids bhi enjoy kar paye, staff ne extra dhyaan rakha. {service} family friendly laga.",
  "Boat ride comfortable thi, guide funny bhi tha. {service} ka vibe relaxed tha.",
  "Coupon / offer clear tha, payment ke baad WhatsApp confirm ho gaya. {service} tension-free raha.",
  "Water clear tha, visibility achi mili. {service} me jo promise kiya wahi mila.",
  "Hum couple the, photographer ne achhe shots liye. {service} romantic + fun dono tha.",
  "Local operator lagta hai genuine, scripted feel nahi aaya. {service} authentic experience tha.",
  "Safety pe focus dikha, briefing me time liya. {service} ke baad confidence badh gaya.",
  "Group me 6 log the, sab manage ho gaya easily. {service} coordination top class thi.",
  "Beach se pickup smooth, return bhi time pe. {service} full day plan ke saath fit ho gaya.",
  "Hum log Pune se the, Goa me pehli baar {service} — full paisa vasool.",
  "Staff ne Hindi + English dono me explain kiya, comfortable laga. {service} must try hai.",
  "Thodi si queue thi but wait worthwhile tha. {service} end me big smile wala moment.",
  "Online review dekh ke book kiya, expectation se better nikla. {service} solid tha.",
  "Jet lag tha but team ne pace adjust kiya. {service} relaxing experience raha.",
  "Humne combo package liya, {service} usme highlight tha. No regret.",
  "Guide ne underwater signs achhe se sikhaye. {service} safe + fun dono.",
  "Phone pe queries ka jawaab fast aaya. {service} booking se leke finish tak support achha.",
  "Goa me bahut operators hai but yeh reliable lage. {service} professionally handle hua.",
  "Hum 3 dost the, sabko alag comfort level tha — staff ne respect kiya. {service} inclusive laga.",
  "Morning slot liya, crowd kam thi. {service} peaceful + clear water.",
  "Return flight same day thi, timing tight tha — phir bhi {service} fit ho gaya.",
  "Sach bolu, best decision of the trip. {service} ke baad baaki din bhi happy mood.",
  "Thoda price compare kiya, yahan transparency achhi thi. {service} value for money.",
  "Underwater photos optional the, force nahi kiya. {service} pressure-free feel.",
  "Hum anniversary pe aaye the, small surprise arrange kar diya team ne. {service} special ban gaya.",
  "Life jacket proper fit kiya, ladies ke liye bhi careful. {service} safety first laga.",
];

export const ENGLISH_REVIEW_TEMPLATES: string[] = [
  "One of the smoothest bookings we made in Goa. {service} was on time and the crew was genuinely helpful.",
  "Clear briefing, clean equipment, and no surprise fees. Would book {service} again on our next trip.",
  "We were first-timers and felt safe the whole way. Great communication before and after {service}.",
  "Exactly as described on the website. {service} ran on schedule and the guide was excellent.",
  "Loved the energy of the team — professional but not pushy. Highlight of our {service} day.",
  "Pickup was punctual and the whole {service} flow was well organized from start to finish.",
  "Transparent pricing and quick WhatsApp confirmation. {service} felt trustworthy, not touristy.",
  "Fantastic views and a calm, confident instructor. Our {service} slot was worth every minute.",
  "We compared a few operators; this one stood out for safety and clarity. {service} delivered.",
  "Memorable experience with friendly staff. {service} exceeded what we expected from photos alone.",
];

/** Pick rating 4 or 5 — mostly 5, some 4 for realism. */
export function demoRatingForIndex(i: number): number {
  const pattern = [5, 5, 4, 5, 5, 4, 5, 5, 5, 4];
  return pattern[i % pattern.length] ?? 5;
}

export function isHinglishReviewIndex(i: number): boolean {
  return i % 10 !== 9 && i % 10 !== 4;
}
