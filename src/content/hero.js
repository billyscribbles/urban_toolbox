// Home hero. Image-led: two photos fill the hero and meet on a diagonal seam
// (caravan left, ute right — see HeroSplit.jsx/.css). Text is deliberately
// minimal — an uppercase two-line H1 plus the green tagline, tucked top-left.
// The category carousel below the hero carries the wayfinding, so there are
// no CTAs or body copy here.
export const hero = {
  headline: 'Custom Caravan',
  headlineLine2: 'Toolboxes',
  // Green accent line under the headline.
  tagline: 'Built to work. Ready to roam.',
  // Both photos render decoratively (empty alt) — the H1 carries the meaning.
  // `alt` is kept in content as the human-readable description of each asset.
  media: {
    left: {
      img: '/brand/hero-caravan-left.jpg',
      alt: 'Caravan with a black aluminium toolbox mounted on the drawbar, golden-hour bush campsite',
    },
    right: {
      img: '/brand/hero-ute-right.jpg',
      alt: 'Black dual-cab ute with aluminium canopy toolbox on a red-dirt track',
    },
  },
}
