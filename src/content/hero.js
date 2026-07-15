// Home hero. Dark panel on the left carries the headline, green tagline and a
// single outlined CTA; on the right, two squared showcase cards — a caravan
// build and a ute build — frame the two things the brand makes. The category
// carousel below the hero carries the rest of the wayfinding.
export const hero = {
  headline: 'Custom Caravan',
  headlineLine2: 'Toolboxes',
  // Green accent line under the headline.
  tagline: 'Built to work. Ready to roam.',
  // Single outlined CTA into the toolbox range.
  cta: { label: 'Explore Toolboxes', to: '/toolboxes' },
  // Two showcase cards. `label` names each build (shown in the card footer);
  // `alt` describes the photo for assistive tech.
  showcase: [
    {
      img: '/brand/hero-caravan.jpg',
      label: 'Caravan Builds',
      alt: 'White caravan with a black aluminium checkerplate toolbox mounted on the drawbar',
    },
    {
      img: '/brand/hero-ute.jpg',
      label: 'Ute Builds',
      alt: 'Black dual-cab ute fitted with aluminium canopy toolboxes on the tray',
    },
  ],
}
