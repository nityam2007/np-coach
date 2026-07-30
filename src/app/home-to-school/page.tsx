import Image from "next/image";
import Link from "next/link";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { assetUrl, getSettings, getSchoolRoutes } from "@/lib/directus";
import type { Faq } from "@/lib/site-config";

export const metadata = buildMetadata({
  title: "Home to School Coach Service | Slough, Burnham, Langley",
  description:
    "Daily home-to-school coach transport for Pioneer Secondary Academy and Herschel Grammar School in Slough. DBS-checked drivers, QR-code boarding and ShuttleID live tracking.",
  path: "/home-to-school",
  titleAbsolute: true,
});

// School FAQ (from the live site) — rendered with the shared accordion + FAQPage JSON-LD.
const schoolFaqs: Faq[] = [
  {
    question: "Does the child need to carry the ticket every day, morning and after school?",
    answer:
      "Yes — it's a QR code they must scan to board. We operate a strict 'no ticket, no ride' policy; a child cannot travel without a valid, scannable QR code.",
  },
  {
    question: "How will the child know which bus to take in the afternoon?",
    answer: "Bus service numbers/codes are clearly displayed. If unsure, please ask any member of the transport team.",
  },
  {
    question: "Is the stop announced, or is the child's name called?",
    answer:
      "Every child is responsible for getting off at the correct stop. Our published timetable clearly shows the order in which the bus drops off.",
  },
  {
    question: "How can I track the bus and see if my child is on board?",
    answer:
      "Sign in at passenger.shuttleid.uk, open Notifications, and enable email boarding notifications — you'll be alerted when your child scans on.",
  },
  {
    question: "My child forgot their QR code — can they scan on with a friend's code?",
    answer:
      "No. If a child is found sharing a QR code we reserve the right to cancel that code, which means repurchasing the full-year ticket to travel again.",
  },
  {
    question: "The bus passes my house — can you drop my child there?",
    answer: "We can only stop at pre-authorised bus stops we hold permits for, so we cannot offer door-to-door drops.",
  },
  {
    question: "I pulled up and the bus had left — why?",
    answer:
      "Buses leave on time whenever possible and never early. Please be at your stop at least 3 minutes before the scheduled time.",
  },
  {
    question: "How do I change my direct debit bank details?",
    answer: "Contact GoCardless directly on 020 7183 8674 to update your bank details.",
  },
  {
    question: "Why is a pass so important if the driver knows my child?",
    answer:
      "It's a legal requirement for all passengers to be manifested. Scanning the pass lets us trace each child and their guardian in an emergency — without a scan, we have no record on board.",
  },
  {
    question: "My child has no phone — how can they scan on?",
    answer: "Bring a printed paper copy of the pass. We cannot accept passengers without the correct pass.",
  },
];

const rules = [
  "Do not pick up or drop children at the bus stop itself — it's unsafe and risks our permit. Drivers who see this may suspend a child's travel for up to 5 days.",
  "Always park with respect for other road users and residents.",
  "Do not block the bus with your vehicle — this may suspend your child's travel for up to 5 days.",
];

export default async function HomeToSchoolPage() {
  const [settings, allRoutes] = await Promise.all([getSettings(), getSchoolRoutes()]);
  const schools = settings.schoolTransport?.schools ?? [];
  const routeCount = (slug: string) => allRoutes.filter((r) => r.school === slug).length;

  return (
    <article>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Home to School", path: "/home-to-school" }]} />

      <PageHero
        eyebrow="Safety first, every day"
        title="Home to School Transport"
        intro="Safe, tracked daily coach travel with DBS-checked drivers, QR-code boarding and live tracking via ShuttleID. Select your school below to buy passes and manage tickets."
        crumbs={[{ label: "Home", href: "/" }, { label: "Home to School" }]}
      >
        <div className="mt-6 max-w-2xl rounded-xl border border-accent/15 bg-white/85 px-4 py-3 text-sm text-navy/80 shadow-sm">
          <strong>Notice:</strong> due to fuel and operating costs, fares may be reviewed during the academic year.
          Parents are notified in advance and may cancel before any revised price takes effect.
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy">Please select your school</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {schools.map((school) => {
            const logo = assetUrl(school.logo);
            const count = routeCount(school.slug);
            return (
              <Link
                key={school.slug}
                href={`/home-to-school/${school.slug}`}
                className="group flex flex-col rounded-xl border border-greyblue/30 bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  {logo ? (
                    <div className="relative h-20 w-20 shrink-0">
                      <Image src={logo} alt={`${school.name} logo`} fill sizes="80px" className="object-contain" />
                    </div>
                  ) : null}
                  <div>
                    <h3 className="font-display text-lg font-semibold text-navy">{school.name}</h3>
                    <p className="mt-1 text-xs text-navy/70">
                      {count} {count === 1 ? "route" : "routes"}
                      {!school.spacesAvailable && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                          Waiting list
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-4 grow text-sm text-navy/70">{school.intro}</p>
                <span className="mt-6 inline-block text-sm font-semibold text-accent group-hover:underline">
                  View routes &amp; book →
                </span>
              </Link>
            );
          })}
        </div>
        {schools.length === 0 && (
          <p className="mt-4 text-sm text-navy/70">
            School booking links are managed in the CMS. Call {settings.phone.display} for help registering.
          </p>
        )}
      </section>

      <FaqAccordion faqs={schoolFaqs} />

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy">Rules for parents &amp; carers</h2>
        <ul className="mt-6 space-y-3">
          {rules.map((rule) => (
            <li
              key={rule}
              className="flex items-start gap-2 rounded-lg border border-greyblue/30 bg-white px-4 py-3 text-sm text-navy"
            >
              <span className="mt-0.5 text-accent">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
