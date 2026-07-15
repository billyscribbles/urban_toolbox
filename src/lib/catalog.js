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

export function getProductsUnder(node) {
  const ids = new Set(getLeaves(node).map((l) => l.id))
  return getProducts().filter((p) => ids.has(p.categoryId))
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
  return { label: top.label, to: `/${top.slug}`, columns, flattened }
}
