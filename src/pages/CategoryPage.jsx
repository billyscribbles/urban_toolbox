import { useParams } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import {
  getCategoryBySlug,
  getCategoryPath,
  getLeaves,
  getProductsForLeaf,
} from '../lib/catalog.js'

// One page renders any catalog category — a Toolboxes subcategory
// (/toolboxes/:subSlug), a bare leaf (Toolbox Canopies), or the flattened
// Accessories root (slug prop). Each leaf under the resolved node becomes a
// ProductRange section; the sticky pill sub-nav and Card grid come for free.
export default function CategoryPage({ slug: slugProp }) {
  const params = useParams()
  const slug = slugProp || params.subSlug
  const node = getCategoryBySlug(slug)

  if (!node) return <NotFoundPage />

  const path = getCategoryPath(slug)
  const top = path[0] || node
  const leaves = getLeaves(node)

  const sections = leaves.map((leaf) => ({
    id: leaf.slug,
    label: leaf.label,
    heading: leaf.label,
    products: getProductsForLeaf(leaf.id),
  }))

  const data = {
    header: {
      eyebrow: top.label === node.label ? 'Range' : top.label,
      title: node.label,
      intro: `Browse our ${node.label.toLowerCase()} range. Every unit is built to order in aluminium — add what fits to your quote and we'll confirm size and price.`,
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
      <ProductRange data={data} />
    </main>
  )
}
