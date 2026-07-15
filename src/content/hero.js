// Home hero. Dark, image-led: a near-black content panel on the left meets a
// single moody feature photo on the right along a diagonal seam (see
// HeroSplit.jsx/.css). Text stays minimal — uppercase two-line H1, green
// tagline, one outlined CTA. The category carousel below the hero carries the
// rest of the wayfinding.
export const hero = {
  headline: 'Custom Caravan',
  headlineLine2: 'Toolboxes',
  // Green accent line under the headline.
  tagline: 'Built to work. Ready to roam.',
  // Single outlined CTA into the toolbox range.
  cta: { label: 'Explore Toolboxes', to: '/toolboxes' },
  // The photo renders decoratively (empty alt) — the H1 carries the meaning.
  // `alt` is kept in content as the human-readable description of the asset.
  media: {
    photo: {
      img: '/brand/hero-caravan-toolbox.jpg',
      alt: 'Black aluminium checkerplate toolbox mounted on a caravan drawbar in a dark workshop',
    },
  },
}
