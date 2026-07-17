// Pure read helpers over the category tree and the live product catalog.
// Components stay dumb: they ask these functions for a tree, a slice of
// products, or the mega-menu view model, and never walk the raw catalog
// themselves. Products now live in Supabase (see lib/productStore.js) — this
// module stays the only read surface callers use, so the swap from the old
// static file was invisible to every page/component.

import { categories } from '../data/categories.js'
import { getProducts } from './productStore.js'

export function getTree() {
  return categories
}

export function getTopCategories() {
  return categories
}

export function isLeaf(node) {
  return !node?.children?.length
}

// Depth-first search of the whole tree by slug (slugs are unique across the tree).
export function getCategoryBySlug(slug) {
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.slug === slug) return n
      if (n.children) {
        const hit = walk(n.children)
        if (hit) return hit
      }
    }
    return undefined
  }
  return walk(categories)
}

// Ancestor chain (root → … → node) for breadcrumbs and active-nav state.
export function getCategoryPath(slug) {
  const path = []
  const walk = (nodes, trail) => {
    for (const n of nodes) {
      const next = [...trail, n]
      if (n.slug === slug) {
        path.push(...next)
        return true
      }
      if (n.children && walk(n.children, next)) return true
    }
    return false
  }
  walk(categories, [])
  return path
}

export function getSubcategories(topSlug) {
  return getCategoryBySlug(topSlug)?.children ?? []
}

// Every leaf under a node (the node itself if it is already a leaf).
export function getLeaves(node) {
  if (!node) return []
  if (isLeaf(node)) return [node]
  return node.children.flatMap(getLeaves)
}

export function getProductsForLeaf(leafId) {
  return getProducts().filter((p) => p.categoryId === leafId)
}

// Depth-first lookup of a category node by its id (used to resolve the top-level
// label for a product from its leaf's categoryId).
export function getCategoryById(id) {
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const hit = walk(n.children)
        if (hit) return hit
      }
    }
    return undefined
  }
  return walk(categories)
}

// Resolve a product by the token used in the shareable URL — its slug, falling
// back to the id for products that predate slugs. Coerces so a numeric id in the
// URL string still matches.
export function getProductByToken(token) {
  if (token == null) return undefined
  const t = String(token)
  return getProducts().find((p) => p.slug === t || String(p.id) === t)
}

// Top-level category label ("Toolboxes" / "Accessories") a product lives under —
// the drawer eyebrow and the quote line's category.
export function getTopLabelForProduct(product) {
  const leaf = product && getCategoryById(product.categoryId)
  const path = leaf ? getCategoryPath(leaf.slug) : []
  return path[0]?.label || ''
}

export function getProductsUnder(node) {
  const ids = new Set(getLeaves(node).map((l) => l.id))
  return getProducts().filter((p) => ids.has(p.categoryId))
}

// The "related products" rail for a product page: other products sharing the
// product's leaf category, broadening to the parent subcategory when the leaf
// is too thin to fill the row. The current product is always excluded, featured
// products float first, and the list is capped at `limit`.
export function getRelatedProducts(product, limit = 3) {
  if (!product) return []
  const leaf = getCategoryById(product.categoryId)
  let pool = getProductsForLeaf(product.categoryId).filter((p) => p.id !== product.id)
  if (pool.length < limit && leaf) {
    const path = getCategoryPath(leaf.slug)
    const parent = path[path.length - 2]
    if (parent) {
      const seen = new Set([product.id, ...pool.map((p) => p.id)])
      pool = [...pool, ...getProductsUnder(parent).filter((p) => !seen.has(p.id))]
    }
  }
  return [...pool].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, limit)
}

// The section list a ProductRange renders for a node: one section per direct
// child when children nest (Toolboxes → subcategories), otherwise one per leaf
// (Accessories → its leaves). `filter`, when given, keeps only matching products
// and drops sections left empty — that's how the vehicle pages slice the range.
// Without a filter, every section is returned as-is (a category page still shows
// an empty subcategory so its pill stays present).
export function buildSections(node, filter = null) {
  if (!node) return []
  const apply = (products) => (filter ? products.filter(filter) : products)
  const grouped = (node.children ?? []).some((child) => !isLeaf(child))
  const sections = grouped
    ? node.children.map((child) => ({
        id: child.slug,
        label: child.label,
        heading: child.label,
        products: apply(getProductsUnder(child)),
      }))
    : getLeaves(node).map((leaf) => ({
        id: leaf.slug,
        label: leaf.label,
        heading: leaf.label,
        products: apply(getProductsForLeaf(leaf.id)),
      }))
  return filter ? sections.filter((s) => s.products.length > 0) : sections
}

// Every category's sections, filtered to products that fit the given vehicle
// ('ute' | 'caravan'). Powers the /utes and /caravans explore pages: one flat
// pill nav spanning Toolboxes + Accessories, each section keeping only the
// products flagged for that vehicle.
export function getVehicleSections(vehicle) {
  const key = vehicle === 'caravan' ? 'fitsCaravan' : 'fitsUte'
  // Tag each section with its top-level category ('Toolboxes' / 'Accessories')
  // so the range nav can split the pills into labelled groups.
  return getTopCategories().flatMap((top) =>
    buildSections(top, (p) => p[key] !== false).map((s) => ({ ...s, group: top.label })),
  )
}

// A top category whose children are ALL leaves renders as one page with the
// leaves as in-page sections (that's Accessories). Otherwise each subcategory is
// its own page (that's Toolboxes).
export function isFlattenedTop(topSlug) {
  const top = getCategoryBySlug(topSlug)
  return !!top?.children?.length && top.children.every(isLeaf)
}

// Nav view model for the dropdown. Each top category becomes a panel:
//   { label, to, columns: [{ label, to, items: [{ label, to }] }] }
// Toolboxes: a subcategory column lists its leaves as `items` (anchored into the
// subcategory page); a bare leaf (Toolbox Canopies) is its own linkable column.
// Accessories (flattened): every leaf is a column linking to an in-page anchor.
export function getMegaMenu(topSlug) {
  const top = getCategoryBySlug(topSlug)
  if (!top) return null
  const flattened = isFlattenedTop(topSlug)

  const columns = (top.children ?? []).map((child) => {
    if (flattened || isLeaf(child)) {
      const to = flattened ? `/${top.slug}#${child.slug}` : `/${top.slug}/${child.slug}`
      return { label: child.label, to, items: [] }
    }
    return {
      label: child.label,
      to: `/${top.slug}/${child.slug}`,
      items: child.children.map((leaf) => ({
        label: leaf.label,
        to: `/${top.slug}/${child.slug}#${leaf.slug}`,
      })),
    }
  })
  return { label: top.label, to: `/${top.slug}`, columns, flattened, showAll: true }
}

// The "Shop by Vehicle" dropdown. Unlike the catalog menus this isn't derived
// from the category tree — customers buy for a caravan *or* a ute, so the two
// vehicle pages (each filters the whole catalog by vehicle) are the only
// entries. There's no combined "all vehicles" index, so the panel carries no
// `showAll` flag and the desktop dropdown omits its "View all" row.
export function getVehicleMenu() {
  return {
    label: 'Shop by Vehicle',
    to: '/caravans',
    columns: [
      { label: 'For Caravans', to: '/caravans', items: [] },
      { label: 'For Utes', to: '/utes', items: [] },
    ],
    flattened: true,
  }
}
