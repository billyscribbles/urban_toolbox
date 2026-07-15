import SEO from '../lib/seo.jsx'
import PageHero from '../components/PageHero.jsx'
import Card from '../components/Card.jsx'
import CtaBand from '../components/CtaBand.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { getCategoryBySlug, getSubcategories, getProductsUnder } from '../lib/catalog.js'

// Landing page for a top category (Toolboxes): a hero over a grid of
// subcategory cards that link into their CategoryPage. Each card borrows the
// first product photo under that subcategory as its thumbnail.
export default function CategoryOverview({ slug, intro }) {
  const top = getCategoryBySlug(slug)
  if (!top) return <NotFoundPage />

  const subs = getSubcategories(slug)

  return (
    <main>
      <SEO
        title={top.label}
        description={`${top.label} — custom aluminium ${top.label.toLowerCase()} built to order in Dandenong South. Browse the range and add to a no-obligation quote.`}
        path={`/${top.slug}`}
      />
      <PageHero eyebrow="Range" title={top.label} intro={intro} />

      <section className="section">
        <div className="container grid grid--3">
          {subs.map((sub) => {
            const hero = getProductsUnder(sub)[0]
            const count = getProductsUnder(sub).length
            return (
              <Card
                key={sub.id}
                to={`/${top.slug}/${sub.slug}`}
                img={hero?.img}
                imgAlt={sub.label}
                ph={sub.label}
                title={sub.label}
                body={count ? `${count} product${count === 1 ? '' : 's'}` : 'Explore the range'}
                cta="Browse"
                height={240}
                titleSize={22}
                pad={26}
                alt
              />
            )
          })}
        </div>
      </section>

      <CtaBand />
    </main>
  )
}
