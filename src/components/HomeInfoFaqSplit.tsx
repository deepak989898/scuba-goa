import { HomeFaqSection } from "@/components/HomeFaqSection";
import { HomeScubaInfoSection } from "@/components/HomeScubaInfoSection";

/** Homepage split: “what to know” left, FAQs right (stacked on mobile). */
export function HomeInfoFaqSplit() {
  return (
    <section
      className="border-t border-ocean-100 bg-sand/40 py-4 sm:py-5"
      aria-label="Scuba diving information and FAQs"
    >
      <div className="site-container site-sidebar-grid--wide">
        <HomeScubaInfoSection />
        <HomeFaqSection />
      </div>
    </section>
  );
}
