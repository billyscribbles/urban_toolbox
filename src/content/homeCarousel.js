// Home category carousel — the tile strip under the hero. One tile per
// mid-level product family, each linking to its category page.
//
// Photos are NOT listed here. Each tile's photo is uploaded per-category in
// the /admin panel (the `category_images` table); when a category has no
// upload, the tile borrows its first product's photo. See
// getCategoryTileImage() in src/lib/catalog.js.
//
// Contract (src/test/content.test.js): every `to` must resolve to a real
// catalog category slug, and every `categoryId` to a real category node.
//
// The component renders alt="" on purpose — the visible label already names
// the link, so a non-empty alt would double-announce it to screen readers.
// That's why no alt text is stored anywhere for these photos.

// Section header for the home range carousel (the component reads these — no
// hardcoded strings live in the component itself).
export const rangeSection = {
  eyebrow: 'Explore our range',
  heading: 'Built for every adventure',
}

export const homeCarousel = [
  {
    label: 'Camper & Trailer Boxes',
    categoryId: 'camper-trailer-boxes',
    to: '/toolboxes/camper-trailer-boxes',
  },
  { label: 'Canopies', categoryId: 'canopies', to: '/toolboxes/canopies' },
  { label: 'Dog Boxes', categoryId: 'dog-boxes', to: '/toolboxes/dog-boxes' },
  {
    label: 'Side Opening Toolboxes',
    categoryId: 'side-opening-toolboxes',
    to: '/toolboxes/side-opening-toolboxes',
  },
  {
    label: 'Top Opening Toolboxes',
    categoryId: 'top-opening-toolboxes',
    to: '/toolboxes/top-opening-toolboxes',
  },
  { label: 'Truck Boxes', categoryId: 'truck-boxes', to: '/toolboxes/truck-boxes' },
  {
    label: 'Under Tray Toolboxes',
    categoryId: 'under-tray-toolboxes',
    to: '/toolboxes/under-tray-toolboxes',
  },
  { label: 'Accessories', categoryId: 'accessories', to: '/accessories' },
]
