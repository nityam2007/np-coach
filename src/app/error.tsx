"use client";

import { Button, ButtonLink } from "@/components/ui/Button";

/** Branded error boundary — apologise, offer retry, never show a stack trace. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-tint via-tint-soft to-offwhite">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:py-32">
        <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">Something went wrong</h1>
        <p className="mt-3 max-w-md text-navy/70">
          Sorry — an unexpected error occurred. Please try again, or head back to the homepage.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
