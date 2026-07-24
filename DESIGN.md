# NP Coaches — Design System Rules

Hand this to anyone touching the UI. The system is small on purpose: fewer choices, sharper pages.

## Tokens (source of truth: `@theme` in [src/app/globals.css](src/app/globals.css))

| Token | Value | Use for |
|---|---|---|
| `navy` | `#172554` | Primary text, dark surfaces |
| `greyblue` | `#a8abbc` | Muted text **on dark surfaces only**; borders at `/15–/40` |
| `offwhite` | `#fdfdfd` | Default page surface |
| `accent` | `#2563eb` | Primary actions + highlighted words — nothing else |
| `brand-hover` | `#1e4fd6` | Hover state of any accent action |
| `brand-deep` | `#1e3a8a` | Dark-band gradient end (`from-navy via-navy to-brand-deep`) |
| `tint` | `#e8eefb` | Strong light-blue wash (hero) |
| `tint-soft` | `#f2f5fb` | Alternating section bands, soft card fills |

**Never introduce a raw hex in markup.** If a colour is missing, add a semantic token first.

## Text colour ramp (WCAG AA-checked on white)

- Primary: `text-navy`
- Muted: `text-navy/70` (≈5.2:1 — the floor for body copy)
- Strong-muted: `text-navy/80`
- On dark: `text-offwhite` / `text-greyblue` / `text-sky-400` for accents

Do not use navy opacities below `/70` for text that carries meaning.

## Typography

- Display/headings: **Geist** (`font-display`), bold, `leading-[1.05–1.1]` on heroes.
- Body: **Inter**, 16px (`text-base`) minimum for form inputs and long-form copy; `text-sm` only for secondary/supporting text.
- Eyebrows: `Eyebrow` component (12px caps, `tracking-[0.18em]`) — no shimmer, no custom variants.
- Scale in practice: `xs · sm · base · lg · 2xl · 3xl · 4xl · 5xl` (+`6xl` hero, display numerals on the fleet band). Don't add arbitrary sizes.

## Spacing & layout

- Section rhythm: `py-16 lg:py-20` (fleet showcase may use `lg:py-24` as the single deliberate exception).
- Containers: `max-w-7xl` shell · `max-w-3xl` prose/forms · `max-w-2xl` centred intros.
- Everything on the 4px grid; no arbitrary pixel values.

## Surfaces

- Radii: `rounded-lg` (8, inputs/small) · `rounded-xl` (12, buttons/chips) · `rounded-2xl` (16, cards) · `rounded-3xl` (24, feature panels) · `full` (pills). `rounded-md` is banned.
- Shadows — three levels, always navy-tinted and faint:
  `shadow-sm shadow-navy/5` (standing cards) · `shadow-md shadow-navy/5–10` (featured panels) · `shadow-lg shadow-navy/10` (hero anchor + floating overlays). Nothing stronger.
- Borders: 1px, `greyblue` at `/15–/40`. Hairline separations inside cards: `divide-greyblue/15`.

## Buttons — use the primitives, never hand-roll

`Button` / `ButtonLink` / `buttonCls` in [src/components/ui/Button.tsx](src/components/ui/Button.tsx):

- `primary` — solid accent. **One per viewport.**
- `secondary` — white + border (light surfaces).
- `inverse` — white (dark bands).
- `ghostDark` — outline (dark bands, supporting).

Sizes: `md` (default) and `sm`. No gradients, no magnetic/tilt effects, no `hover:opacity`.

## Forms

Field classes come from [src/components/ui/field.ts](src/components/ui/field.ts) (`inputCls`, `labelCls`, `fieldErrorCls`): 16px text, `rounded-lg`, focus = accent border + `ring-accent/20`. Labels above inputs; errors inline in red-600. **Never change `name`/`id` attributes — they are wired to server actions.**

## Motion

- Entrances: `Reveal` / `Stagger` only — fade + 16px rise, 0.5s, ease-out. No blur, no parallax, no 3D.
- Micro-interactions: 150–300ms colour/shadow/translate on hover; `active:scale-[0.98]` on buttons.
- Everything respects `prefers-reduced-motion` (framer's `useReducedMotion` + `motion-safe:`).
- Keyboard focus: global `:focus-visible` accent outline — never remove it.

## Page anatomy

Light pages: `PageHero` (navy gradient band) → content sections alternating `offwhite` / `tint-soft`.
Homepage rhythm: hero wash → offwhite → tint-soft → navy (fleet) → offwhite → tint-soft → offwhite → navy footer.
Trust elements sit **next to decision points** (booking form, quote CTAs), not at page bottoms.
