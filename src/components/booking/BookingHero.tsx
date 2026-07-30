import { CmsRemoteImage } from "@/components/CmsRemoteImage";

const HERO_LEFT =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=75";
const HERO_RIGHT =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=75";

/** Compact hero so cart + checkout fit above the fold on desktop. */
export function BookingHero() {
  return (
    <section className="relative overflow-hidden rounded-xl shadow-md sm:rounded-2xl">
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
        className="absolute inset-0 bg-gradient-to-b from-ocean-950/50 via-ocean-950/40 to-ocean-950/65"
        aria-hidden
      />
      <div className="relative z-10 px-4 py-5 text-center sm:px-6 sm:py-6 lg:py-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100 sm:text-[11px]">
          ~~ Reserve your dive ~~
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-3xl md:text-4xl">
          <span className="text-white">Clear price,</span>{" "}
          <span className="text-orange-400">Small advance</span>
        </h1>
        <p className="mx-auto mt-1.5 max-w-xl text-xs text-cyan-50/95 sm:text-sm">
          Choose your package · Select your date · Dive in. Contact details only
          when you pay.
        </p>
      </div>
    </section>
  );
}
