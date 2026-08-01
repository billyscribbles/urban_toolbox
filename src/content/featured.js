// Home "Featured Products" rail — section copy only.
//
// The products themselves are NOT listed here: the rail renders every product
// with `featured` ticked in /admin, in catalogue order. See
// getFeaturedProducts() in src/lib/catalog.js.
//
// Deliberately just a heading and a CTA label: the rail sits high on the page
// and the products speak for themselves, so it carries no eyebrow and no
// strapline. Both were tried and cut — they cost a screenful of height for
// copy nobody needs to read.
//
// Contract (src/test/content.test.js): both strings must be non-empty.
export const featuredSection = {
  heading: 'Featured Products',
  cta: 'View details',
}
