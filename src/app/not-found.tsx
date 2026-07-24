import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Branded 404 — calm, on-system, and always offers a way forward. */
export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-tint via-tint-soft to-offwhite">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:py-32">
        <p className="font-display text-7xl font-bold text-navy/10">404</p>
        <h1 className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">
          This page has left the depot
        </h1>
        <p className="mt-3 max-w-md text-navy/70">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back on the road.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" className="group">
            Back to home
            <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </ButtonLink>
          <ButtonLink href="/get-a-quote" variant="secondary">
            Get a quote
          </ButtonLink>
          <ButtonLink href="/daily-express-service" variant="secondary">
            Book Daily Express
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
