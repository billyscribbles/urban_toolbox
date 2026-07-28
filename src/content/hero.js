// Home hero — one full-bleed photo with the lockup stacked lower-left: a green
// eyebrow, a two-line uppercase heading, a short paragraph and two CTAs that
// split the audience down the middle (caravan owners / ute owners) into their
// explore-by-vehicle pages. The trust strip sits in its own band below.
//
// The photo lives at /brand/hero-home.jpg with 800/1600 webp derivatives beside
// it (`yarn images`). Replacing the hero shot means dropping a new file at that
// same path and re-running the script — nothing else moves.
export const hero = {
  eyebrow: 'Premium storage solutions',
  // Two lines so the break is a deliberate part of the lockup rather than
  // whatever the viewport width happens to do to it.
  headingLines: ['Built to work.', 'Built to last.'],
  description:
    "Premium toolboxes and storage solutions for utes and caravans. Built tough for Australia's harshest conditions.",
  ctas: [
    { label: 'Explore Caravans', to: '/caravans' },
    { label: 'Explore Utes', to: '/utes' },
  ],
  img: '/brand/hero-home.jpg',
  alt: 'Dual-cab ute fitted with a black aluminium canopy and tray, hitched to an off-road caravan on a red outback dirt road at sunset',
}
