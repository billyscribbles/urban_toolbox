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
export default function SEO({ title, description, image, path = '', noindex = false }) {
  const seo = site.seo
  const resolvedTitle = title ? seo.titleTemplate.replace('%s', title) : seo.defaultTitle
  const resolvedDescription = description || seo.description
  const rawImage = image || seo.ogImage
  // Social crawlers need an absolute image URL.
  const resolvedImage = rawImage.startsWith('http') ? rawImage : `${seo.siteUrl}${rawImage}`
  const url = `${seo.siteUrl}${path}`

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={url} />
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
    </Helmet>
  )
}
