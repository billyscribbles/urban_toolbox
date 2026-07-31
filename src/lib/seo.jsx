import { Helmet } from 'react-helmet-async'
import { site } from '../config/site.config.js'

// Organization structured data — built once from site.config so search engines
// get a machine-readable brand record. Becomes LocalBusiness automatically when
// a contact address/phone is present.
const organizationLd = (() => {
  const sameAs = Object.values(site.social || {}).filter(Boolean)
  const hasLocation = Boolean(site.contact?.location || site.contact?.phone)
  const schema = {
    '@context': 'https://schema.org',
    '@type': hasLocation ? 'LocalBusiness' : 'Organization',
    name: site.brand.name,
    url: site.seo.siteUrl,
    description: site.seo.description,
  }
  if (site.brand.logoSrc) schema.logo = `${site.seo.siteUrl}${site.brand.logoSrc}`
  if (sameAs.length) schema.sameAs = sameAs
  if (site.contact?.phone) schema.telephone = site.contact.phone
  // A LocalBusiness with an image, trading hours, a served area and a price
  // band is what Google needs to build the knowledge panel and to rank the
  // business for "near me" queries — the old site's local signal, extended.
  schema.image = `${site.seo.siteUrl}${site.seo.ogImage}`
  schema.priceRange = '$$'
  if (site.contact?.openingHours) {
    schema.openingHoursSpecification = site.contact.openingHours.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.days,
      opens: slot.opens,
      closes: slot.closes,
    }))
  }
  if (site.contact?.areaServed) {
    schema.areaServed = site.contact.areaServed.map((name) => ({ '@type': 'Place', name }))
  }
  // Structured address + geo pin — carried over from the old site's schema so
  // Google keeps the map location and local relevance after the migration.
  if (site.contact?.address) {
    const a = site.contact.address
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: a.street,
      addressLocality: a.locality,
      addressRegion: a.region,
      postalCode: a.postalCode,
      addressCountry: a.country,
    }
  }
  if (site.contact?.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: site.contact.geo.lat,
      longitude: site.contact.geo.lng,
    }
  }
  if (site.contact?.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: site.contact.email,
      ...(site.contact.phone && { telephone: site.contact.phone }),
    }
  }
  return JSON.stringify(schema)
})()

// Per-page SEO wrapper. Pass `title` and `description` to override defaults.
// All other tags fall back to site.config.seo.
//
// `schema` takes one JSON-LD object or an array of them (see lib/schema.js) and
// emits them as a single top-level array — valid JSON-LD, and one script tag
// rather than N keeps Helmet's child handling simple.
export default function SEO({
  title,
  description,
  image,
  path = '',
  noindex = false,
  schema = null,
}) {
  const seo = site.seo
  const resolvedTitle = title ? seo.titleTemplate.replace('%s', title) : seo.defaultTitle
  const resolvedDescription = description || seo.description
  const rawImage = image || seo.ogImage
  // Social crawlers need an absolute image URL.
  const resolvedImage = rawImage.startsWith('http') ? rawImage : `${seo.siteUrl}${rawImage}`
  // `|| '/'` so the home page's canonical is the same URL the sitemap lists.
  // Without it the two disagreed (".com.au" vs ".com.au/") — harmless to Google,
  // but a needless inconsistency in the two files auditors read first.
  const url = `${seo.siteUrl}${path || '/'}`
  const pageLd = schema ? JSON.stringify([].concat(schema)) : null

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {/* A noindex page must not also claim a canonical: on the 404 page that
          canonical resolved to the homepage, which tells Google the error page
          IS the homepage. noindex alone is the unambiguous signal. */}
      {!noindex && <link rel="canonical" href={url} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:locale" content={seo.locale} />
      <meta property="og:site_name" content={site.brand.name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />
      <script type="application/ld+json">{organizationLd}</script>
      {pageLd && <script type="application/ld+json">{pageLd}</script>}
    </Helmet>
  )
}
