import { CmsRemoteImage } from "@/components/CmsRemoteImage";

const HERO_LEFT =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=75";
const HERO_RIGHT =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=75";

export function BookingHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl shadow-lg sm:rounded-3xl">
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="relative">
          <CmsRemoteImage
            src={HERO_LEFT}
            alt=""
            fill
            className="object-cover"
            sizes="50vw"
            priority
          />
        </div>
        <div className="relative">
          <CmsRemoteImage
            src={HERO_RIGHT}
            alt=""
            fill
            className="object-cover"
            sizes="50vw"
            priority
          />
        </div>
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-ocean-950/55 via-ocean-950/45 to-ocean-950/70"
        aria-hidden
      />
      <div className="relative z-10 px-4 py-10 text-center sm:px-8 sm:py-14 lg:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-100 sm:text-xs">
          ~~ Reserve your dive ~~
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
          <span className="text-white">Clear price,</span>
          <br />
          <span className="text-orange-400">Small advance</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-cyan-50/95 sm:text-base">
          Choose your package · Select your date · Dive in. Contact details only
          when you pay.
        </p>
      </div>
    </section>
  );
}
