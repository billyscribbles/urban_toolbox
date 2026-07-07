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
      title: 'Caravan Toolboxes',
      body: 'Checkerplate aluminium boxes built to sit flush on your drawbar or A-frame. Weathersealed, lockable, tough.',
      cta: 'Explore',
      to: '/caravan-toolboxes',
      ph: 'PRODUCT SHOT',
      phSub: 'caravan toolbox',
      img: '/images/caravan-tb-295.jpg',
      imgAlt: 'Aluminium checkerplate caravan toolbox with the lid raised',
    },
    {
      icon: 'Truck',
      title: 'Utes',
      body: 'Trays, toolboxes, canopies, service bodies and accessories — fabricated to fit your ute and finished to last.',
      cta: 'Explore',
      to: '/utes',
      ph: 'PRODUCT SHOT',
      phSub: 'ute tray / canopy',
      img: '/images/ute-category.jpg',
      imgAlt:
        'Black dual-cab ute fitted with a tray and twin aluminium checkerplate canopy toolboxes',
    },
    {
      icon: 'Truck',
      title: 'Trucks',
      body: 'Full-height gullwing toolboxes and tapered under-tray boxes for cab-chassis, tippers and fleet trucks.',
      cta: 'Explore',
      to: '/trucks',
      ph: 'PRODUCT SHOT',
      phSub: 'truck toolbox',
      img: '/images/tb-1700-600-b.png',
      imgAlt: 'Aluminium checkerplate gullwing truck toolbox with drawers',
    },
  ],
}
