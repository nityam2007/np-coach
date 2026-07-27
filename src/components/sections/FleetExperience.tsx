import Image from "next/image";
import { assetUrl } from "@/lib/directus";
import type { FleetPageContent } from "@/lib/site-config";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { StripesBackdrop } from "@/components/ui/Backdrops";

export function FleetExperience({
  content,
  image,
}: {
  content: FleetPageContent;
  image?: string | null;
}) {
  const background = assetUrl(image);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy text-offwhite">
        {background && (
          <>
            <Image
              src={background}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/60" />
          </>
        )}
        <StripesBackdrop dark />
        <Reveal className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-24">
          <Eyebrow className="text-sky-400">{content.charterEyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            {content.charterHeading}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-greyblue sm:text-lg">
            {content.charterBody}
          </p>
          <ButtonLink href={content.charterCta.href} className="mt-8">
            {content.charterCta.label}
            <Icon name="arrowRight" className="h-4 w-4" />
          </ButtonLink>
        </Reveal>
      </section>

      <section className="bg-offwhite">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>{content.stepsEyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              {content.stepsHeading}
            </h2>
            <p className="mt-3 text-navy/65">{content.stepsIntro}</p>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4" gap={0.06}>
            {content.steps.map((step, index) => (
              <StaggerItem key={step.title}>
                <div
                  className={`h-full rounded-2xl border p-6 shadow-sm ${
                    index === 0
                      ? "border-navy bg-navy text-offwhite"
                      : "border-greyblue/20 bg-white text-navy"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${
                      index === 0 ? "bg-accent text-white" : "bg-accent/10 text-accent"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold">{step.title}</h3>
                  <p className={`mt-2 text-sm leading-6 ${index === 0 ? "text-greyblue" : "text-navy/65"}`}>
                    {step.body}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
