// Pure read helpers over the category tree and the live product catalog.
// Components stay dumb: they ask these functions for a tree, a slice of
// products, or the mega-menu view model, and never walk the raw catalog
// themselves. Products now live in Supabase (see lib/productStore.js) — this
// module stays the only read surface callers use, so the swap from the old
// static file was invisible to every page/component.

import { categories } from '../data/categories.js'
import { getProducts, getCategoryImages } from './productStore.js'
import { publicPhotoUrl } from './supabaseClient.js'

export function getTree() {
  return categories
}

export function getTopCategories() {
  return categories
}

export function isLeaf(node) {
  return !node?.children?.length
}

// Nodes tagged `vehicle` ('ute' | 'truck') or `exclusive` (e.g.
// 'australian-made') are scope-exclusive: hidden from the generic mega-menu and
// category pages, surfaced only on the page that passes their scope. Untagged
// nodes are visible everywhere.
const scopeOf = (node) => node?.vehicle || node?.exclusive || null
const visibleFor = (node, scope = null) => {
  const s = scopeOf(node)
  return !s || s === scope
}

// What nav pills, section headings and the vehicle menu show for a node —
// `shortLabel` when the node carries one (Truck Accessories reads "Accessories"
// on surfaces that already say the vehicle), else the full `label`. The node's
// own page keeps using `label`, so /truck-accessories' <title> stays qualified
// and can't collide with /accessories'.
const displayLabel = (node) => node?.shortLabel ?? node?.label

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

// Everything a scoped top folds in from the generic top it `absorbs`, filtered
// by the scoped top's own vehicle flag. Empty for nodes that absorb nothing.
// Lives here (not in getVehicleSections) so the fold applies wherever the
// node's sections are built — its /trucks section and its own category page
// must show the same products and can't be allowed to drift.
function absorbedProductsFor(node) {
  if (!node?.absorbs) return []
  const absorbedTop = getTopCategories().find((t) => t.id === node.absorbs)
  if (!absorbedTop) return []
  const key = VEHICLE_FIT[node.vehicle]
  return getProductsUnder(absorbedTop).filter((p) => !key || p[key] !== false)
}

// The section list a ProductRange renders for a node: one section per direct
// child when children nest (Toolboxes → subcategories), otherwise one per leaf
// (Accessories → its leaves). `filter`, when given, keeps only matching products
// and drops sections left empty — that's how the vehicle pages slice the range.
// Without a filter, every section is returned as-is (a category page still shows
// an empty subcategory so its pill stays present). `vehicle` widens visibility
// to that vehicle's exclusive nodes; their sections come back `pinned` so the
// vehicle page keeps them even before their first product lands.
export function buildSections(node, filter = null, vehicle = null) {
  if (!node) return []
  const apply = (products) => (filter ? products.filter(filter) : products)
  // An absorbing top (always a leaf) appends its generic counterpart's flagged
  // stock behind its own filed products — filed first, absorbed after.
  const foldFor = (leaf) => (leaf === node ? absorbedProductsFor(node) : [])
  const kids = (node.children ?? []).filter((child) => visibleFor(child, vehicle))
  const grouped = kids.some((child) => !isLeaf(child))
  const sections = grouped
    ? kids.map((child) => ({
        id: child.slug,
        label: displayLabel(child),
        heading: displayLabel(child),
        pinned: !!child.vehicle,
        products: apply(getProductsUnder(child)),
      }))
    : (isLeaf(node) ? [node] : kids.flatMap(getLeaves)).map((leaf) => ({
        id: leaf.slug,
        label: displayLabel(leaf),
        heading: displayLabel(leaf),
        pinned: !!leaf.vehicle,
        products: [...apply(getProductsForLeaf(leaf.id)), ...apply(foldFor(leaf))],
      }))
  return filter ? sections.filter((s) => s.products.length > 0 || s.pinned) : sections
}

// Every vehicle page slices the whole generic catalogue by its per-product
// fitment flag. The tops scoped to the vehicle (`vehicle:` nodes) come back
// pinned beside the generic groups (ute's Trays/Canopy/Service Canopy) —
// unless a scoped top `absorbs` a generic one, in which case it swallows that
// top's flagged products and the generic group leaves the page (truck's pair
// absorbs Toolboxes and Accessories, keeping /trucks two sections deep).
const VEHICLE_FIT = { ute: 'fitsUte', caravan: 'fitsCaravan', truck: 'fitsTruck' }

const topsForVehicle = (vehicle) => {
  const tops = getTopCategories().filter((top) => visibleFor(top, vehicle))
  const absorbed = new Set(
    tops.filter((t) => t.vehicle === vehicle && t.absorbs).map((t) => t.absorbs),
  )
  return tops.filter((top) => !absorbed.has(top.id))
}

// Every category's sections for the given vehicle page: generic sections keep
// only the products flagged for the vehicle, exclusive sections come back
// pinned (kept even while empty).
export function getVehicleSections(vehicle) {
  const key = VEHICLE_FIT[vehicle]
  const filter = key ? (p) => p[key] !== false : null
  // Tag each section with its top-level category so the range nav can split the
  // pills into labelled groups. An absorbing top's fold (generic flagged stock
  // behind its own filed products) happens inside buildSections, so its section
  // here matches its standalone category page exactly.
  return topsForVehicle(vehicle).flatMap((top) =>
    buildSections(top, filter, vehicle).map((s) => ({
      ...s,
      group: displayLabel(top),
      // Anchor id for the whole group on the vehicle page (the nav's
      // "Toolboxes" / "Accessories" deep links land on it).
      groupSlug: top.slug,
      // Only the vehicle-exclusive tops carry `vehicle`, so this tags exactly
      // those sections for the fitment chip — they have no hero of their own
      // here to state it. Generic tops get undefined and render no chip.
      fitment: top.vehicle,
    })),
  )
}

// A top category whose children are ALL leaves renders as one page with the
// leaves as in-page sections (that's Accessories). Otherwise each subcategory is
// its own page. `pages: true` forces the per-page form even for an all-leaf top
// (that's Toolboxes — six flat families that each deserve their own page).
export function isFlattenedTop(topSlug) {
  const top = getCategoryBySlug(topSlug)
  if (!top?.children?.length || top.pages) return false
  return top.children.every(isLeaf)
}

// Nav view model for the dropdown. Each top category becomes a panel:
//   { label, to, columns: [{ label, to, items: [{ label, to }] }] }
// Toolboxes (`pages`): each of the six families is a bare leaf, so every
// column links straight to its own /toolboxes/<slug> page with no sub-items. A
// column that DOES nest lists its leaves as `items`, anchored into that page.
// Accessories (flattened): every leaf is a column linking to an in-page anchor.
export function getMegaMenu(topSlug) {
  const top = getCategoryBySlug(topSlug)
  if (!top) return null
  const flattened = isFlattenedTop(topSlug)

  const columns = (top.children ?? [])
    .filter((child) => visibleFor(child))
    .map((child) => {
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

  // A scope-exclusive top can opt into a generic menu with `alsoInMenu` —
  // Truck Toolboxes stays a /trucks-scoped category but is listed under the
  // Toolboxes panel too, as a link out to its own single-segment page. Listed
  // after the top's own families, so the vehicle line reads as the odd one out.
  for (const node of categories) {
    if (node.alsoInMenu === topSlug) {
      columns.push({ label: node.label, to: `/${node.slug}`, items: [] })
    }
  }

  return { label: top.label, to: `/${top.slug}`, columns, flattened, showAll: true }
}

// The "Shop by Vehicle" dropdown. One column per vehicle page, each listing
// the top-level groups that page offers (Caravans: the generic catalog tops;
// Utes: those plus the ute-exclusive tops; Trucks: only its own two scoped
// tops), deep-linked to the group anchors. `listItems` tells the desktop panel
// to render those items downwards under each vehicle heading — catalog panels
// stay compact. There's no combined "all vehicles" index, so no `showAll` flag
// / "View all" row.
export function getVehicleMenu() {
  const column = (label, path, vehicle) => ({
    label,
    to: path,
    items: topsForVehicle(vehicle).map((top) => ({
      label: displayLabel(top),
      to: `${path}#${top.slug}`,
    })),
  })
  return {
    label: 'Shop by Vehicle',
    to: '/caravans',
    columns: [
      column('Caravans', '/caravans', 'caravan'),
      column('Utes', '/utes', 'ute'),
      column('Trucks', '/trucks', 'truck'),
    ],
    flattened: true,
    listItems: true,
  }
}

// The "Custom" dropdown. Hand-built (not catalog-driven): the Australian Made
// line lives here as a plain topic link. No sub-items, so no `showAll` row.
export function getCustomMenu() {
  return {
    label: 'Custom',
    to: '/australian-made',
    columns: [{ label: 'Australian Made', to: '/australian-made', items: [] }],
  }
}

// Headings for scope-exclusive top-level leaves — the nav menu each one is
// reachable from, so the admin files it the same way a person would look for it.
const SCOPE_HEADINGS = {
  ute: 'Utes',
  caravan: 'Caravans',
  truck: 'Trucks',
  'australian-made': 'Custom',
}

// Admin category picker view model: the same leaves the nav exposes, grouped
// the way the nav groups them. Products attach to leaves, but a FLAT leaf list
// reads nothing like the nav. So: one group per top category, a nested leaf
// qualified with its subcategory (nothing nests today, but the tree allows it),
// and the scope-exclusive tops (ute-only Trays/Canopy/Service Canopy, the
// truck-only Toolboxes/Accessories pair, the Australian Made line) bucketed
// under the menu that surfaces them.
// Shape:
//   [{ label, options: [{ id, label }] }]
export function getAdminCategoryGroups() {
  const groups = []
  const scoped = new Map()

  for (const top of categories) {
    if (isLeaf(top)) {
      const heading = SCOPE_HEADINGS[scopeOf(top)] ?? top.label
      const bucket = scoped.get(heading) ?? []
      bucket.push({ id: top.id, label: top.label })
      scoped.set(heading, bucket)
      continue
    }
    groups.push({
      label: top.label,
      options: (top.children ?? []).flatMap((child) =>
        isLeaf(child)
          ? [{ id: child.id, label: child.label }]
          : getLeaves(child).map((leaf) => ({
              id: leaf.id,
              label: `${child.label} → ${leaf.label}`,
            })),
      ),
    })
  }

  for (const [label, options] of scoped) groups.push({ label, options })
  return groups
}

// The "About" dropdown. Hand-built: the About page plus the Fabrication service
// page as plain topic links. No sub-items, so no `showAll` row.
export function getAboutMenu() {
  return {
    label: 'About',
    to: '/about',
    columns: [
      { label: 'About Us', to: '/about', items: [] },
      { label: 'Fabrication', to: '/fabrication', items: [] },
    ],
  }
}

// --- Home-carousel tile photos -------------------------------------------

// The first product photo under a category, in the caller's array order. A
// parent node resolves through its leaves, so the Accessories tile finds a
// photo instead of coming up empty.
//
// `products` defaults to the live catalogue (already ordered sort_order then
// id, the same order the category page shows — so the tile matches what a
// visitor sees when they click it). The admin passes its own mapped rows,
// which is why this filters by leaf id rather than delegating to
// getProductsUnder: that helper reads getProducts() directly and would ignore
// the array handed in.
export function firstProductImageIn(categoryId, products = getProducts()) {
  const node = getCategoryById(categoryId)
  if (!node) return null
  const ids = new Set(getLeaves(node).map((l) => l.id))
  return products.find((p) => ids.has(p.categoryId) && p.img)?.img ?? null
}

// The photo for a home-carousel tile: an admin upload wins, otherwise the tile
// borrows its category's first product photo. null when neither exists — the
// carousel renders an empty media box rather than dropping the tile.
export function getCategoryTileImage(categoryId) {
  const uploaded = getCategoryImages()[categoryId]
  return uploaded ? publicPhotoUrl(uploaded) : firstProductImageIn(categoryId)
}

// The home page's "Featured Products" rail: every product with `featured`
// ticked in /admin. getProducts() already excludes hidden rows and is ordered
// sort_order then id, so the rail matches catalogue order for free — there is
// deliberately no separate ordering column to keep in sync. `limit` caps a
// runaway rail; 12 is four full pages at the desktop card count.
//
// Exported because the cap is otherwise invisible: the admin's Featured
// Products tab imports it to warn about the rows it silently drops.
export const FEATURED_RAIL_LIMIT = 12

export function getFeaturedProducts(limit = FEATURED_RAIL_LIMIT) {
  return getProducts()
    .filter((p) => p.featured)
    .slice(0, limit)
}
