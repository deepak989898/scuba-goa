import Image from "next/image";

/**
 * Single composite booking header image (hero + trust chips + advance bar baked in).
 */
export function BookingHero() {
  return (
    <section className="overflow-hidden rounded-xl shadow-md sm:rounded-2xl">
      <h1 className="sr-only">
        Reserve your dive — clear price, small advance. Choose your package,
        select your date, then pay online.
      </h1>
      <Image
        src="/booking-header.webp"
        alt="Reserve your dive — clear price, small advance. Instant confirmation, secure Razorpay, 4.9 star rated, WhatsApp support. Pay ₹199 per person now as advance."
        width={1280}
        height={480}
        priority
        sizes="(max-width: 768px) 100vw, 1280px"
        quality={78}
        className="h-auto w-full"
      />
    </section>
  );
}
