import { Link } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import PageHero from '../components/PageHero.jsx'
import Eyebrow from '../components/Eyebrow.jsx'
import FeatureGrid from '../components/FeatureGrid.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { servicePages } from '../content/fabrication.js'
import { breadcrumbSchema } from '../lib/schema.js'
import { site } from '../config/site.config.js'
import './ServicePage.css'

// Standalone page for a single fabrication service (/laser-cutting, /folding).
//
// These two URLs ranked on their own on the old GoDaddy site, so they stay real
// pages instead of redirects into #anchors on /fabrication — Google discards the
// fragment, which would have collapsed two ranking URLs into one. Content comes
// entirely from `servicePages` in src/content/fabrication.js.
export default function ServicePage({ slug }) {
  const page = servicePages[slug]
  const path = `/${slug}`

  // Service schema — tells Google this is a named service offered by the
  // business, at its address, rather than just another page of copy.
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.seo.title,
    description: page.seo.description,
    url: `${site.seo.siteUrl}${path}`,
    serviceType: page.header.title,
    areaServed: { '@type': 'State', name: 'Victoria, Australia' },
    provider: {
      '@type': 'LocalBusiness',
      name: site.brand.name,
      url: site.seo.siteUrl,
      telephone: site.contact.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: site.contact.address.street,
        addressLocality: site.contact.address.locality,
        addressRegion: site.contact.address.region,
        postalCode: site.contact.address.postalCode,
        addressCountry: site.contact.address.country,
      },
    },
  }

  return (
    <main>
      <SEO
        title={page.seo.title}
        description={page.seo.description}
        image={page.img}
        path={path}
        schema={[
          serviceLd,
          breadcrumbSchema([{ label: 'Fabrication', to: '/fabrication' }], page.header.title),
        ]}
      />

      <PageHero
        eyebrow={page.header.eyebrow}
        title={page.header.title}
        intro={page.header.intro}
        bgImage={page.img}
      />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <Eyebrow>{page.offer.eyebrow}</Eyebrow>
            <h2 className="h2 h2--md">{page.offer.heading}</h2>
          </div>
          <div className="grid grid--3">
            {page.offer.items.map((item) => (
              <div className="svc-card" key={item.title}>
                <h3 className="svc-card__title">{item.title}</h3>
                <p className="svc-card__body">{item.body}</p>
                <ul className="svc-card__points">
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeatureGrid
        eyebrow={page.materials.eyebrow}
        heading={page.materials.heading}
        items={page.materials.items}
      />

      {/* Internal links back into the fabrication cluster — keeps the three
          service pages linked to each other and to their parent. */}
      <section className="section svc-related">
        <div className="container svc-related__inner">
          <p className="svc-related__label">More from our workshop</p>
          <nav className="svc-related__links" aria-label="Related services">
            <Link className="btn btn--outline" to="/fabrication">
              All fabrication services
            </Link>
            {Object.entries(servicePages)
              .filter(([key]) => key !== slug)
              .map(([key, other]) => (
                <Link className="btn btn--outline" key={key} to={`/${key}`}>
                  {other.header.title}
                </Link>
              ))}
            <Link className="btn btn--outline" to="/toolboxes">
              Aluminium toolboxes
            </Link>
          </nav>
        </div>
      </section>

      <CtaBand />
    </main>
  )
}
