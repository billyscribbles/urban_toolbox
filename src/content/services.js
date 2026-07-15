// Home "What we build" — three linked category cards.
// Each card shows a striped photo slot (ph / phSub), a heading, body, and a
// green "Explore →" link to the category page. `icon` is retained for the
// content contract but the card renders the photo slot, not an icon.
export const services = {
  eyebrow: 'What we build',
  heading: 'Storage that goes the distance',
  items: [
    {
      icon: 'Box',
      title: 'Toolboxes',
      body: 'Under-tray, top-opening, side-opening, truck boxes, dog boxes and canopies — checkerplate aluminium, weathersealed and lockable, built to fit.',
      cta: 'Explore',
      to: '/toolboxes',
      ph: 'PRODUCT SHOT',
      phSub: 'aluminium toolbox',
      img: '/images/catalog/full-lid-opening-1.jpg',
      imgAlt: 'Aluminium checkerplate full side-opening ute toolbox with shelving',
    },
    {
      icon: 'Wrench',
      title: 'Accessories',
      body: 'Locks, drawer and shelving units, gas struts, ladder racks, cargo cages and the hardware that finishes a build.',
      cta: 'Explore',
      to: '/accessories',
      ph: 'PRODUCT SHOT',
      phSub: 'toolbox accessories',
      img: '/images/catalog/drawer-units-1.jpg',
      imgAlt: 'Black aluminium three-drawer slide unit for a ute toolbox',
    },
    {
      icon: 'Truck',
      title: 'Fabrication',
      body: 'Laser cutting, folding and welding — one-off brackets to full custom builds, cut and formed to your drawings.',
      cta: 'Explore',
      to: '/fabrication',
      ph: 'PRODUCT SHOT',
      phSub: 'custom fabrication',
      img: '/images/fabrication.jpg',
      imgAlt: 'Aluminium sheet metal being fabricated in the Dandenong South workshop',
    },
  ],
}
