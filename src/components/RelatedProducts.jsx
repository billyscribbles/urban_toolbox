import Card from './Card.jsx'
import { getRelatedProducts, getTopLabelForProduct } from '../lib/catalog.js'

// "Related products" rail at the foot of a product page — same-category picks
// rendered with the shared Card so each one links straight to its own page.
// Renders nothing when the catalog has no siblings to show.
export default function RelatedProducts({ product }) {
  const related = getRelatedProducts(product)
  if (!related.length) return null

  return (
    <section className="section section--alt">
      <div className="container">
        <div className="section-head">
          <h2 className="h2 h2--md">Related products</h2>
        </div>
        <div className="grid grid--3 range-grid">
          {related.map((p) => (
            <Card
              key={p.id || p.title}
              slug={p.slug}
              img={p.img}
              imgAlt={p.imgAlt}
              images={p.images}
              imageFit={p.imageFit}
              imageTone={p.imageTone}
              imagePosition={p.imagePosition}
              title={p.title}
              body={p.summary}
              height={240}
              titleSize={22}
              pad={26}
              alt
              quote={p.quote}
              price={p.price}
              discountPct={p.discountPct}
              quoteCategory={getTopLabelForProduct(p)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
