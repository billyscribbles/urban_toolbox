import SEO from '../lib/seo.jsx'
import PageHero from '../components/PageHero.jsx'
import Card from '../components/Card.jsx'
import FeatureGrid from '../components/FeatureGrid.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { caravan } from '../content/caravan.js'

export default function CaravanPage() {
  return (
    <main>
      <SEO
        title="Caravan Toolboxes"
        description="Custom aluminium checkerplate caravan toolboxes — A-frame, tunnel boot and generator boxes built to your van's exact measurements in Dandenong South."
        path="/caravan-toolboxes"
      />
      <PageHero
        eyebrow={caravan.header.eyebrow}
        title={caravan.header.title}
        intro={caravan.header.intro}
      />

      <section className="section">
        <div className="container grid grid--3">
          {caravan.products.map((p) => (
            <Card
              key={p.title}
              ph={p.ph}
              phSub={p.phSub}
              title={p.title}
              body={p.body}
              height={240}
              titleSize={22}
              pad={26}
              alt
            />
          ))}
        </div>
      </section>

      <FeatureGrid heading={caravan.features.heading} items={caravan.features.items} boxed />

      <CtaBand />
    </main>
  )
}
