// Home category carousel — the tile strip under the hero. One tile per
// mid-level product family, each linking to its category page. Images are
// representative product shots from the catalog assets.
//
// Contract (src/test/content.test.js): every `to` must resolve to a real
// catalog category slug, and every `img` must exist under public/.
//
// `imgAlt` is the asset's human-readable description, kept in content only —
// the component renders alt="" on purpose (the visible label already names
// the link; a non-empty alt would double-announce it to screen readers).
// Section header for the home range carousel (the component reads these — no
// hardcoded strings live in the component itself).
export const rangeSection = {
  eyebrow: 'Explore our range',
  heading: 'Built for every adventure',
}

export const homeCarousel = [
  {
    label: 'Camper & Trailer Boxes',
    img: '/images/catalog/caravan-boxes-1.jpg',
    imgAlt: 'Aluminium checkerplate camper and trailer box',
    to: '/toolboxes/camper-trailer-boxes',
  },
  {
    label: 'Canopies',
    img: '/images/catalog/toolbox-canopies-1.jpg',
    imgAlt: 'Aluminium ute canopy',
    to: '/toolboxes/canopies',
  },
  {
    label: 'Dog Boxes',
    img: '/images/catalog/full-dog-boxes-1.jpg',
    imgAlt: 'Aluminium full dog box with ventilation panels',
    to: '/toolboxes/dog-boxes',
  },
  {
    label: 'Drawer Units',
    img: '/images/catalog/drawer-units-1.jpg',
    imgAlt: 'Black aluminium toolbox drawer unit',
    to: '/toolboxes/toolbox-drawer-units',
  },
  {
    label: 'Side Opening Toolboxes',
    img: '/images/catalog/half-lid-opening-1.jpg',
    imgAlt: 'Half lid side opening aluminium toolbox',
    to: '/toolboxes/side-opening-toolboxes',
  },
  {
    label: 'Top Opening Toolboxes',
    img: '/images/catalog/rectangle-ute-toolbox-1.jpg',
    imgAlt: 'Rectangle top opening aluminium ute toolbox',
    to: '/toolboxes/top-opening-toolboxes',
  },
  {
    label: 'Truck Boxes',
    img: '/images/catalog/full-lid-opening-truck-1.jpg',
    imgAlt: 'Aluminium full side opening truck tool box',
    to: '/toolboxes/truck-boxes',
  },
  {
    label: 'Under Tray Toolboxes',
    img: '/images/catalog/ute-under-tray-boxes-1.jpg',
    imgAlt: 'Aluminium checkerplate under tray ute toolbox',
    to: '/toolboxes/under-tray-toolboxes',
  },
  {
    label: 'Accessories',
    img: '/images/catalog/ladder-rack-1.jpg',
    imgAlt: 'Boltable aluminium ladder rack',
    to: '/accessories',
  },
]
