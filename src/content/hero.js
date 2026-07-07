// Home hero. Bright, light layout: a white content panel on the left over a
// single full-bleed feature photo that fills the right. The H1 renders as two
// uppercase ink lines, followed by a green tagline line, then the body copy.
//
// `media.slides` is the hero photo set. A single slide shows static; add a
// second and the component crossfades between them on a timer (and holds still
// for visitors with reduced-motion enabled).
export const hero = {
  eyebrow: 'Premium Caravan Toolboxes',
  headline: 'Custom Caravan',
  headlineLine2: 'Toolboxes',
  // Green accent line under the headline.
  tagline: 'Built to work. Ready to roam.',
  subheadline:
    'Precision-engineered aluminium toolboxes, built tough for the harshest conditions and every adventure.',
  // Both CTAs are internal routes — primary goes to the quote form.
  primaryCta: { label: 'Get a Quote', to: '/quote' },
  secondaryCta: { label: 'View Range', to: '/caravan-toolboxes' },
  media: {
    slides: [
      {
        img: '/brand/hero-caravan-toolbox.jpg',
        // Object-position is controlled in CSS per breakpoint (anchored right on
        // desktop, centred on mobile), so no inline `pos` override here.
        alt: 'Custom Urban Toolboxes checkerplate toolbox mounted on a caravan drawbar',
      },
    ],
  },
}
