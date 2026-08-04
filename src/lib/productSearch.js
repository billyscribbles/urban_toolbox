// Title-only keyword filter behind the catalog search box. Every whitespace-
// separated keyword must appear (case-insensitive) somewhere in a product's
// title; sections that end up empty are dropped so the page collapses to
// matches only. An empty query returns the input untouched.
export function filterSections(sections, query) {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!keywords.length) return sections

  return sections
    .map((section) => ({
      ...section,
      products: section.products.filter((p) => {
        const title = (p.title || '').toLowerCase()
        return keywords.every((k) => title.includes(k))
      }),
    }))
    .filter((section) => section.products.length > 0)
}
