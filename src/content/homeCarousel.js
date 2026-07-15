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
export const homeCarousel = [
  {
    label: 'Under Tray Toolboxes',
    img: '/images/catalog/ute-under-tray-boxes-1.jpg',
    imgAlt: 'Aluminium checkerplate under tray ute toolbox',
    to: '/toolboxes/under-tray-toolboxes',
  },
  {
    label: 'Top Opening Toolboxes',
    img: '/images/catalog/rectangle-ute-toolbox-1.jpg',
    imgAlt: 'Rectangle top opening aluminium ute toolbox',
    to: '/toolboxes/top-opening-toolboxes',
  },
  {
    label: 'Side Opening Toolboxes',
    img: '/images/catalog/half-lid-opening-1.jpg',
    imgAlt: 'Half lid side opening aluminium toolbox',
    to: '/toolboxes/side-opening-toolboxes',
  },
  {
    label: 'Truck Toolboxes',
    img: '/images/catalog/under-truck-tool-boxes-1.jpg',
    imgAlt: 'Aluminium under truck toolbox',
    to: '/toolboxes/truck-toolboxes',
  },
  {
    label: 'Dog Boxes',
    img: '/images/catalog/full-dog-boxes-1.jpg',
    imgAlt: 'Aluminium full dog box with ventilation panels',
    to: '/toolboxes/dog-boxes',
  },
  {
    label: 'Toolbox Canopies',
    img: '/images/catalog/toolbox-canopies-1.jpg',
    imgAlt: 'Aluminium toolbox canopy',
    to: '/toolboxes/toolbox-canopies',
  },
  {
    label: 'Accessories',
    img: '/images/catalog/drawer-units-1.jpg',
    imgAlt: 'Toolbox drawer unit accessory',
    to: '/accessories',
  },
]
