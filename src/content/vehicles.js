// Copy for the three explore-by-vehicle pages (/utes, /caravans, /trucks) —
// title, eyebrow, intro, SEO description, route and hero photo per vehicle.
// VehiclePage reads this directly (`vehicles[vehicle] || vehicles.ute`) so
// the page body stays a thin filter over the shared catalog read layer; no
// client strings live in the component itself.
//
// Contract (src/test/content.test.js): every entry's `title`, `intro`, `seo`
// and `path` must be non-empty, `path` must start with "/", and `heroImage`
// must exist under public/. `heroImage` is read as a single CSS background
// photo (PageHero's `--page-hero-image`), not through <Img>, so there's no
// srcset to check.
export const vehicles = {
  ute: {
    title: 'For Utes',
    eyebrow: 'Shop by vehicle',
    intro:
      'Every toolbox, canopy and accessory we build for utes — under-tray boxes, top and side openers, drawers and locks. All Australian-made in aluminium and built to order. Add what fits your setup to a no-obligation quote.',
    seo: 'Aluminium ute toolboxes, canopies and accessories — Australian-made, built to order in Dandenong South. Add to a no-obligation quote.',
    path: '/utes',
    heroImage: '/brand/hero-product-ute.webp',
  },
  caravan: {
    title: 'For Caravans',
    eyebrow: 'Shop by vehicle',
    intro:
      'Toolboxes, storage and accessories suited to caravans and campers — checkerplate boxes, water tanks, drawers and locks. All Australian-made in aluminium and built to order. Add what fits your rig to a no-obligation quote.',
    seo: 'Aluminium caravan toolboxes, storage and accessories — Australian-made, built to order in Dandenong South. Add to a no-obligation quote.',
    path: '/caravans',
    heroImage: '/brand/hero-product-caravan.webp',
  },
  truck: {
    title: 'For Trucks',
    eyebrow: 'Shop by vehicle',
    intro:
      'Aluminium toolboxes and accessories built for trucks — underbody and top-opening boxes, drawers, racks and locks. Australian-made and built to order, measured to your truck. Add what fits to a no-obligation quote.',
    seo: 'Aluminium truck toolboxes and accessories — Australian-made, built to order in Dandenong South. Add to a no-obligation quote.',
    path: '/trucks',
    heroImage: '/brand/hero-truck-1600.webp',
  },
}
