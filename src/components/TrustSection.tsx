"use client";

import { motion } from "framer-motion";

export function TrustSection() {
  const pillars = [
    { title: "Certified operators", body: "Verified partners & briefing-first sessions." },
    { title: "Secure checkout", body: "Razorpay payments with clear booking references." },
    { title: "WhatsApp confirmation", body: "Slot and pickup details on your phone." },
  ];

  return (
    <section
      id="trust"
      className="bg-white pt-8 pb-14 sm:pt-10 sm:pb-20"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-ocean-500 sm:text-sm">
            Why guests actually pay &amp; show up
          </p>
          <h2
            id="trust-heading"
            className="mt-1.5 font-display text-2xl font-bold text-ocean-900 sm:mt-2 sm:text-3xl lg:text-4xl"
          >
            10,000+ Happy Customers
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ocean-700 sm:mt-3 sm:text-base">
            You&apos;re not buying a PDF itinerary—you&apos;re buying a confirmed slot,
            a real crew, and Razorpay-backed payment. Ask for credentials before you pay;
            we expect that.
          </p>
        </motion.div>
        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-6"
        >
          {pillars.map((p) => (
            <li
              key={p.title}
              className="rounded-2xl border border-ocean-100 bg-ocean-50/60 px-4 py-4 text-center sm:px-5 sm:py-5"
            >
              <p className="font-display text-sm font-semibold text-ocean-900 sm:text-base">
                {p.title}
              </p>
              <p className="mt-1.5 text-xs text-ocean-700 sm:text-sm">{p.body}</p>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
