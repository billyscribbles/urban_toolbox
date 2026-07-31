// JSON-LD builders for the page-scoped structured data.
//
// The sitewide LocalBusiness record lives in lib/seo.jsx (it ships on every
// page via Helmet). Everything here is per-page and is rendered inline by the
// page that owns it, so the shapes stay next to the data they describe.

import { site } from '../config/site.config.js'
import { discountedPrice } from './pricing.js'

const SITE = site.seo.siteUrl

// Absolute URLs — crawlers reject relative ones in structured data.
function absolute(url) {
  if (!url) return undefined
  return url.startsWith('http') ? url : `${SITE}${url}`
}

// BreadcrumbList mirrors the visible breadcrumb trail. Google uses it to render
// the crumb path in place of the raw URL in the results snippet.
//
// `crumbs` is [{ label, to }] in order, excluding the current page; `current` is
// the current page's label. Anchor-only crumbs (…#slug) are kept as-is: they
// resolve to a real page, which is all the spec requires.
export function breadcrumbSchema(crumbs, current) {
  const items = [{ label: 'Home', to: '/' }, ...crumbs]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      ...items.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.label,
        item: absolute(crumb.to),
      })),
      // The current page carries no `item` — per Google's guidance the last
      // crumb is the page you're on, so linking it to itself adds nothing.
      { '@type': 'ListItem', position: items.length + 1, name: current },
    ],
  }
}

// Product schema. Drives the price / availability chips under the result in
// Google Search — the single biggest visual upgrade available to these pages.
//
// Products with no price are quote-only. They still get a Product record (name,
// image, brand all help), but no `offers`: an offer without a price is invalid
// structured data and would earn a Search Console error rather than a rich result.
export function productSchema(product, { path, categoryLabel }) {
  const price = discountedPrice(product.price, product.discountPct) ?? product.price

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    url: absolute(path),
    brand: { '@type': 'Brand', name: site.brand.name },
    manufacturer: { '@type': 'Organization', name: site.brand.name },
    // "Australian made" is a genuine purchase driver in this category and the
    // only country-of-origin field Google reads on a Product.
    countryOfOrigin: 'AU',
  }

  const description =
    product.summary ||
    `${product.title} — Australian-made aluminium, built to order in Dandenong South, Victoria.`
  schema.description = description

  const images = [product.img, ...(product.images ?? []).map((i) => i.src)]
    .filter(Boolean)
    .map(absolute)
  if (images.length) schema.image = [...new Set(images)]

  if (categoryLabel) schema.category = categoryLabel

  if (product.specs?.length) {
    schema.additionalProperty = product.specs
      .filter((s) => s?.label && s?.value)
      .map((s) => ({ '@type': 'PropertyValue', name: s.label, value: String(s.value) }))
  }

  if (product.colors?.length) {
    schema.color = product.colors.map((c) => c.label || c.name || c).join(', ')
  }

  if (price != null) {
    schema.offers = {
      '@type': 'Offer',
      url: absolute(path),
      price: String(price),
      priceCurrency: 'AUD',
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/BackOrder',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: site.brand.name },
    }
  }

  return schema
}

// ItemList for a category page — tells Google the page is a listing and what's
// on it, which helps it pick the right products to surface for the category query.
export function itemListSchema(products, { name, path }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: absolute(path),
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: product.title,
      url: absolute(`/product/${product.slug || product.id}`),
    })),
  }
}
