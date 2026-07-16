import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { buildSections, getCategoryBySlug, getCategoryPath } from '../lib/catalog.js'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'

// One page renders any catalog category — the Toolboxes root (slug prop, every
// product shown grouped by its top-level type), a Toolboxes subcategory
// (/toolboxes/:subSlug), a bare leaf (Toolbox Canopies), or the flattened
// Accessories root. Sections become a ProductRange; the sticky pill sub-nav and
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
    },
    sections,
  }

  return (
    <main>
      <SEO
        title={node.label}
        description={`${node.label} — Australian-made aluminium, built to order in Dandenong South. ${sections.length} categories, add to a no-obligation quote.`}
        path={slugProp ? `/${node.slug}` : `/${top.slug}/${node.slug}`}
      />
      <ProductRange data={data} status={status} onRetry={retryLoad} />
    </main>
  )
}
