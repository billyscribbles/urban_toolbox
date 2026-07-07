// Trucks range. Same section-driven shape as utes.js — the page renders each
// section and builds its sub-nav from { id, label }. Full-height gullwing
// toolboxes and tapered under-tray boxes for cab-chassis and tipper builds.
export const trucks = {
  header: {
    eyebrow: 'For the fleet & the yard',
    title: 'Trucks',
    intro:
      'Full-height toolboxes and tapered under-tray boxes for cab-chassis, tippers and fleet trucks — aluminium checkerplate and powder-coated flat plate, built to your chassis rails.',
    note: 'Prices exclude GST. Contact us for pricing and to match a box to your chassis.',
  },
  sections: [
    {
      id: 'toolboxes',
      label: 'Tool Boxes',
      heading: 'Truck Tool Boxes',
      sub: 'Full-height side-opening and gullwing boxes that sit on the headboard or behind the cab.',
      columns: 3,
      products: [
        {
          title: '1400 × 550 × 800mm',
          img: '/images/tb-1400.png',
          imgAlt:
            'Black powder-coated full-height truck toolbox with drop-down door and slide tray',
          body: '1400 × 550 × 800mm · powder-coated aluminium · side door with drop-down and slide tray · Enquire for pricing',
        },
        {
          title: '1600 × 700 × 820mm',
          img: '/images/tb-1600.png',
          imgAlt: 'Black powder-coated full-height truck toolbox',
          body: '1600 × 700 × 820mm · powder-coated aluminium · full-height side-opening · Enquire for pricing',
        },
        {
          title: '1700 × 530 × 820mm',
          img: '/images/tb-1700-530.png',
          imgAlt: 'Aluminium checkerplate full-height gullwing truck toolbox',
          body: '1700 × 530 × 820mm · aluminium checkerplate · gullwing door · Enquire for pricing',
        },
        {
          title: '1700 × 600 × 820mm',
          img: '/images/tb-1700-600-a.png',
          imgAlt: 'Aluminium checkerplate full-height side-opening truck toolbox',
          body: '1700 × 600 × 820mm · aluminium checkerplate · side-opening door · Enquire for pricing',
        },
        {
          title: '1700 × 600 × 820mm Drawers',
          img: '/images/tb-1700-600-b.png',
          imgAlt: 'Aluminium checkerplate gullwing truck toolbox with three drawers',
          body: '1700 × 600 × 820mm · aluminium checkerplate · gullwing door with three drawers · Enquire for pricing',
        },
        {
          title: '2100 × 600 × 820mm',
          img: '/images/tb-2100.png',
          imgAlt: 'Black powder-coated full-height truck toolbox',
          body: '2100 × 600 × 820mm · powder-coated aluminium · full-height side-opening · Enquire for pricing',
        },
      ],
    },
    {
      id: 'under-tray',
      label: 'Under-Tray Tool Boxes',
      heading: 'Under-Tray Tool Boxes',
      sub: 'Tapered boxes that mount between the chassis rails, under the tray floor.',
      columns: 2,
      products: [
        {
          title: '1700mm Under-Tray',
          img: '/images/utt-1700-a.png',
          imgAlt: 'Tapered aluminium under-tray toolbox with top lid and slide tray',
          body: '1700mm tapered under-tray box · top lid with slide tray · Enquire for pricing',
        },
        {
          title: '1700 × 580 × 820mm Under-Tray',
          img: '/images/utt-1700-580.png',
          imgAlt: 'Aluminium checkerplate tapered under-tray toolbox with side door',
          body: '1700 × 580 × 820mm · aluminium checkerplate · tapered under-tray, side door · Enquire for pricing',
        },
        {
          title: '1770 × 800 × 820mm Under-Tray',
          img: '/images/utt-1770.png',
          imgAlt: 'Black powder-coated tapered under-tray toolbox',
          body: '1770 × 800 × 820mm · powder-coated aluminium · tapered under-tray box · Enquire for pricing',
        },
        {
          title: '2200 × 550 × 550mm Under-Tray',
          img: '/images/utt-2200.png',
          imgAlt: 'Long double-tapered aluminium under-tray toolbox',
          body: '2200 × 550 × 550mm · powder-coated aluminium · long double-tapered under-tray box · Enquire for pricing',
        },
      ],
    },
  ],
}
