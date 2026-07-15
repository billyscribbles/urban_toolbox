// Home hero — a full-bleed 50/50 photo split, styled after the editorial
// reference: warm-sand eyebrow, a single-word title-case heading, a short
// description and one small white pill CTA per side, over a dark-scrimmed photo.
// Both panels funnel into the single toolbox range (the catalog has no separate
// caravan category). Images live under /brand/hero-* with 800/1600 webp
// derivatives.
export const hero = {
  // Decorative label inside the circular centre divider (aria-hidden).
  centerLabel: '//',
  panels: [
    {
      key: 'caravan',
      eyebrow: 'Built for adventure',
      heading: 'Caravans',
      description:
        'Premium caravan storage and toolboxes, built for comfort, freedom and the long haul.',
      cta: { label: 'Explore Caravans', to: '/toolboxes' },
      img: '/brand/hero-caravan.jpg',
      alt: 'Off-road caravan beside a lake at sunset, black aluminium checkerplate toolboxes on the drawbar',
    },
    {
      key: 'ute',
      eyebrow: 'Tough. Reliable. Ready.',
      heading: 'Utes',
      description: 'Tough, custom-built ute storage engineered to work as hard as you do.',
      cta: { label: 'Explore Utes', to: '/toolboxes' },
      img: '/brand/hero-ute.jpg',
      alt: 'Grey dual-cab 4x4 ute in the desert fitted with black aluminium tray toolboxes and a roof rack',
    },
  ],
}
