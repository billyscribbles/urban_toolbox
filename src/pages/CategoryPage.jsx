import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { buildSections, getCategoryBySlug, getCategoryPath } from '../lib/catalog.js'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'
import { breadcrumbSchema, itemListSchema } from '../lib/schema.js'

// One page renders any catalog category — the Toolboxes root (slug prop, every
// product shown grouped by family), one of the eight Toolboxes families
// (/toolboxes/:subSlug), a bare vehicle-exclusive leaf (Trays), or the
// flattened Accessories root. Sections become a ProductRange; the sticky pill sub-nav and
// Card grid come for free. When a node has nested children, each direct child is
// one section aggregating every product beneath it — so nothing has to be
// clicked through. Otherwise each leaf is its own section.
export default function CategoryPage({ slug: slugProp, intro }) {
  const params = useParams()
  const { status } = useProductCatalog()
  useEffect(() => {
    loadProducts()
  }, [])

  const slug = slugProp || params.subSlug
  const node = getCategoryBySlug(slug)

  if (!node) return <NotFoundPage />

  const path = getCategoryPath(slug)
  const top = path[0] || node

  const sections = buildSections(node)

  const data = {
    header: {
      eyebrow: top.label === node.label ? 'Range' : top.label,
      title: node.label,
      intro:
        intro ||
        `Browse our ${node.label.toLowerCase()} range. Every unit is built to order in aluminium — add what fits to your quote and we'll confirm size and price.`,
      // Vehicle-exclusive categories (Trays, Canopy, Service Canopy) answer
      // "will it fit my ute?" in the hero — see FitmentBadge.
      fitment: node.vehicle,
    },
    sections,
  }

  const path_ = slugProp ? `/${node.slug}` : `/${top.slug}/${node.slug}`
  // A subcategory sits under its top-level parent; a top-level page sits
  // directly under Home. Mirrors the pill sub-nav the user actually sees.
  const crumbs =
    slugProp || top.slug === node.slug ? [] : [{ label: top.label, to: `/${top.slug}` }]
  const listed = sections.flatMap((section) => section.products)

  return (
    <main>
      <SEO
        title={node.label}
        description={`${node.label} — Australian-made aluminium, built to order in Dandenong South. ${sections.length} categories, add to a no-obligation quote.`}
        path={path_}
        schema={[
          breadcrumbSchema(crumbs, node.label),
          // Only worth emitting once the catalogue has actually loaded —
          // an empty ItemList is a worse signal than none at all.
          ...(listed.length ? [itemListSchema(listed, { name: node.label, path: path_ })] : []),
        ]}
      />
      <ProductRange data={data} status={status} onRetry={retryLoad} />
    </main>
  )
}
