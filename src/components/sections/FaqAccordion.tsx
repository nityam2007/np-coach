"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Faq } from "@/lib/site-config";
import { Reveal } from "@/components/ui/motion";
import { safeJson } from "@/lib/safe-json";

/** Accessible FAQ accordion. Also emits FAQPage JSON-LD for SEO. */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }} />
      <Reveal>
        <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Frequently asked questions</h2>
      </Reveal>
      <dl className="mt-8 divide-y divide-greyblue/20 overflow-hidden rounded-xl border border-greyblue/30 bg-white">
        {faqs.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div key={faq.question} className={isOpen ? "bg-accent/[0.02]" : ""}>
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display font-semibold text-navy transition-colors hover:text-accent"
                >
                  {faq.question}
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-lg leading-none text-accent transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
              </dt>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.dd
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden text-sm text-navy/70"
                  >
                    <div className="px-5 pb-5">{faq.answer}</div>
                  </motion.dd>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
