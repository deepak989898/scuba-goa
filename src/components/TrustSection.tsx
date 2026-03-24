"use client";

import { motion } from "framer-motion";

export function TrustSection() {
  return (
    <section className="bg-white pt-8 pb-14 sm:pt-10 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-ocean-500 sm:text-sm">
            Trust built on every tide
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ocean-900 sm:mt-2 sm:text-3xl lg:text-4xl">
            10,000+ Happy Customers
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ocean-700 sm:mt-3 sm:text-base">
            Certified partners, audited gear cycles, and rescue-ready boats—ask us
            for operator credentials before you pay.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
