"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useMotionValueEvent } from "motion/react";
import type { SiteSettings } from "@/lib/directus";
import type { NavLink } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Icon, type IconName } from "@/components/ui/Icon";

/** Rich mega-menu panel for a nav item with children (icon + label + description). */
function MegaMenu({ item }: { item: NavLink }) {
  const wide = (item.children?.length ?? 0) > 3;
  return (
    <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
      <div
        className={`grid max-w-[calc(100vw-1.5rem)] gap-1 rounded-2xl border border-greyblue/20 bg-white/95 p-3 shadow-lg shadow-navy/10 ring-1 ring-white/60 backdrop-blur ${
          wide ? "w-[34rem] grid-cols-2" : "w-72 grid-cols-1"
        }`}
      >
        {item.children!.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            className="group/mm flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent/5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent transition-colors group-hover/mm:bg-accent group-hover/mm:text-white">
              <Icon name={(child.icon as IconName) ?? "arrowRight"} className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy">{child.label}</span>
              {child.description && (
                <span className="block text-xs leading-snug text-navy/70">{child.description}</span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Sticky site header: announcement bar, logo, pill nav with sliding active pill + mega
 *  menus, phone + magnetic CTA, and an animated mobile drawer. Shrinks/solidifies on scroll. */
export function Header({ settings }: { settings: SiteSettings }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const logo = assetUrl(settings.logo);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  // Treat the mobile drawer as a real modal: contain keyboard focus, support Escape,
  // make page content inert, and return focus to the trigger when it closes.
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const background = Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
    const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(drawer?.querySelectorAll<HTMLElement>(selector) ?? []);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden";
    for (const element of background) element.inert = true;
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      document.body.style.overflow = "";
      for (const element of background) element.inert = false;
      window.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => previouslyFocused?.focus());
    };
  }, [open]);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50">
      <motion.div
        animate={{
          backgroundColor: scrolled ? "rgba(253,253,253,0.92)" : "rgba(253,253,253,0.72)",
          boxShadow: scrolled ? "0 8px 24px -14px rgba(23,37,84,0.25)" : "0 0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="border-b border-greyblue/20 backdrop-blur"
      >
        <div
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-[padding] duration-300 ease-out sm:px-6"
          style={{ paddingTop: scrolled ? "0.6rem" : "0.85rem", paddingBottom: scrolled ? "0.6rem" : "0.85rem" }}
        >
          <Link href="/" className="group flex shrink-0 items-center gap-2" aria-label={`${settings.name} home`}>
            {logo ? (
              <Image
                src={logo}
                alt={`${settings.name} logo`}
                width={120}
                height={48}
                priority
                className="w-auto object-contain transition-[height,transform] duration-300 ease-out group-hover:scale-105"
                style={{ height: scrolled ? "2.4rem" : "2.75rem" }}
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy font-display text-sm font-bold text-offwhite transition-transform group-hover:scale-105">
                NP
              </span>
            )}
            <span className="hidden font-display text-lg font-semibold tracking-tight text-navy sm:block">
              {settings.name}
            </span>
          </Link>

          {/* Desktop pill nav — active item gets a sliding pill via layoutId. */}
          <nav
            className="hidden items-center gap-1 rounded-full border border-greyblue/20 bg-white/70 p-1 shadow-sm lg:flex"
            aria-label="Primary"
          >
            {settings.nav.map((item) => {
              const directGroupMatch = isActive(item.href);
              const anotherGroupMatches = settings.nav.some((candidate) => candidate !== item && isActive(candidate.href));
              const active = directGroupMatch || (!anotherGroupMatches && !!item.children?.some((child) => isActive(child.href)));
              return item.children?.length ? (
                <div key={item.label} className="group relative">
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      active ? "text-navy" : "text-navy/80 hover:text-navy"
                    }`}
                  >
                    {active && !reduce && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-accent/10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {item.label}
                    <Icon name="chevronDown" className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                  </Link>
                  <MegaMenu item={item} />
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "text-navy" : "text-navy/80 hover:text-navy"
                  }`}
                >
                  {active && !reduce && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-accent/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 rounded-full border border-greyblue/25 px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-accent/40 hover:bg-navy/5"
            >
              <Icon name="user" className="h-4 w-4" />
              Account
            </Link>
            <Link
              href="/get-a-quote"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md"
            >
              Get a Quote
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            ref={triggerRef}
            onClick={() => setOpen((v) => !v)}
            className="relative grid h-10 w-10 place-items-center rounded-lg text-navy transition-colors hover:bg-navy/5 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <span className="sr-only">Menu</span>
            <span className="relative block h-4 w-6">
              <motion.span
                className="absolute left-0 top-0 block h-0.5 w-6 rounded bg-navy"
                animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="absolute left-0 top-1/2 block h-0.5 w-6 -translate-y-1/2 rounded bg-navy"
                animate={open ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="absolute bottom-0 left-0 block h-0.5 w-6 rounded bg-navy"
                animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
            </span>
          </button>
        </div>
      </motion.div>

      {/* Mobile drawer — slides in from the right with staggered links + scrim. */}
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
              ref={drawerRef}
            <motion.nav
              className="fixed right-0 top-0 z-50 flex h-dvh w-[86%] max-w-sm flex-col overflow-y-auto bg-white shadow-lg lg:hidden"
              aria-label="Mobile"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="flex items-center justify-between border-b border-greyblue/15 px-5 py-4">
                <span className="font-display text-lg font-semibold text-navy">{settings.name}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-navy hover:bg-navy/5"
                  aria-label="Close menu"
                >
                  <Icon name="arrowRight" className="h-5 w-5 rotate-180" />
                </button>
              </div>

              <motion.ul
                className="flex flex-1 flex-col gap-1 px-4 py-4"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}
              >
                {settings.nav.map((item) => (
                  <motion.li
                    key={item.label}
                    variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                  >
                    {item.children?.length ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpanded((v) => (v === item.label ? null : item.label))}
                          aria-expanded={expanded === item.label}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-semibold text-navy hover:bg-navy/5"
                        >
                          {item.label}
                          <Icon
                            name="chevronDown"
                            className={`h-4 w-4 transition-transform ${expanded === item.label ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {expanded === item.label && (
                            <motion.ul
                              className="ml-2 space-y-0.5 overflow-hidden border-l border-greyblue/20 pl-2"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              {item.children.map((child) => (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-navy/80 hover:bg-navy/5 hover:text-navy"
                                  >
                                    <Icon name={(child.icon as IconName) ?? "arrowRight"} className="h-4 w-4 text-accent" />
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-3 py-3 font-semibold text-navy hover:bg-navy/5"
                      >
                        {item.label}
                      </Link>
                    )}
                  </motion.li>
                ))}
              </motion.ul>

              <div className="mt-auto flex flex-col gap-3 border-t border-greyblue/15 p-4">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-navy hover:bg-navy/5"
                >
                  <Icon name="user" className="h-4 w-4 text-accent" />
                  My account
                </Link>
                <a href={settings.phone.href} className="flex items-center gap-2 px-3 text-sm font-semibold text-navy">
                  <Icon name="phone" className="h-4 w-4 text-accent" />
                  {settings.phone.display}
                </a>
                <Link
                  href="/get-a-quote"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-white shadow-sm shadow-accent/20"
                >
                  Get a Quote
                  <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
