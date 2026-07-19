import { HomeFaqSection } from "@/components/HomeFaqSection";
import { HomeScubaInfoSection } from "@/components/HomeScubaInfoSection";

/** Homepage split: “what to know” left, FAQs right (stacked on mobile). */
export function HomeInfoFaqSplit() {
  return (
    <section
      className="border-t border-ocean-100 bg-sand/40 py-4 sm:py-5"
      aria-label="Scuba diving information and FAQs"
    >
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:px-8">
        <HomeScubaInfoSection />
        <HomeFaqSection />
      </div>
    </section>
  );
}
