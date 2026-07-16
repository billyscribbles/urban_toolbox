// Home "shop by vehicle" band — two cards routing to the explore-by-vehicle
// pages. Images are the same hero shots used elsewhere on the site.
//
// Contract (src/test/content.test.js): every `to` must start with "/" and every
// `img` must exist under public/.
export const shopByVehicle = {
  eyebrow: 'Shop by vehicle',
  heading: 'Built for your setup',
  cards: [
    {
      label: 'For Utes',
      sub: 'Under-tray boxes, canopies, drawers, locks & more',
      to: '/utes',
      img: '/brand/hero-ute.jpg',
      imgAlt: 'Aluminium toolbox fitted to a ute tray',
    },
    {
      label: 'For Caravans',
      sub: 'Storage boxes, water tanks, locks & accessories',
      to: '/caravans',
      img: '/brand/hero-caravan.jpg',
      imgAlt: 'Aluminium toolbox suited to a caravan',
    },
  ],
}
