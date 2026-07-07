// Home hero. Bright, light layout: a white content panel on the left over a
// single full-bleed feature photo that fills the right. The H1 renders as two
// lines; both are ink (no accent).
//
// `media.slides` is the rotating hero photo set — the ute and caravan builds
// crossfade on a timer. Slide 0 shows first on load. Add or reorder slides here;
// the component fades between them automatically (and holds still for visitors
// with reduced-motion enabled).
export const hero = {
  eyebrow: 'Premium Caravan & Ute Toolboxes',
  headline: 'Built for work.',
  headlineLine2: 'Ready for adventure.',
  subheadline:
    'Custom aluminium toolboxes, trays and canopies designed and fabricated in Dandenong South.',
  // Both CTAs are internal routes — primary goes to the quote form.
  primaryCta: { label: 'Get a Quote', to: '/quote' },
  secondaryCta: { label: 'View the Range', to: '/utes' },
  media: {
    slides: [
      {
        img: '/images/ute-hero.jpg',
        pos: 'center 32%',
        alt: 'Ute fitted with dual custom Urban Toolboxes checkerplate canopies',
      },
      {
        img: '/brand/hero-caravan.jpg',
        pos: 'center 42%',
        alt: 'Caravan fitted with a custom Urban Toolboxes checkerplate toolbox',
        // This photo is bright on the left, so it reads clean without the white
        // scrim — show it full-bleed and let the scrim fade out while it's up.
        scrim: false,
      },
    ],
  },
}
