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
    },
    {
      icon: 'Truck',
      title: 'Ute Accessories',
      body: 'Under-tray boxes, canopies, drawers, headboards and ladder racks fabricated to fit your rig perfectly.',
      cta: 'Explore',
      to: '/ute-accessories',
      ph: 'PRODUCT SHOT',
      phSub: 'ute canopy / under-tray',
    },
    {
      icon: 'Wrench',
      title: 'Fabrication',
      body: 'Laser cutting, folding and custom metal fabrication. Send a sketch and we make it come to life.',
      cta: 'Explore',
      to: '/fabrication',
      ph: 'PRODUCT SHOT',
      phSub: 'fabrication / laser cutting',
    },
  ],
}
