import SEO from '../lib/seo.jsx'
import PageHero from '../components/PageHero.jsx'
import Card from '../components/Card.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { ute } from '../content/ute.js'

export default function UtePage() {
  return (
    <main>
      <SEO
        title="Ute Accessories"
        description="Under-tray boxes, canopies, drawer systems, headboards and racks — aluminium ute accessories fabricated to fit your tray in Dandenong South."
        path="/ute-accessories"
      />
      <PageHero eyebrow={ute.header.eyebrow} title={ute.header.title} intro={ute.header.intro} />

      <section className="section">
        <div className="container grid grid--2">
          {ute.products.map((p) => (
            <Card
              key={p.title}
              ph={p.ph}
              phSub={p.phSub}
              img={p.img}
              imgAlt={p.imgAlt}
              title={p.title}
              body={p.body}
              height={260}
              titleSize={23}
              alt
            />
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  )
}
