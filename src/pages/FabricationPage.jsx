import { Crosshair, Spline, Wrench } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import PageHero from '../components/PageHero.jsx'
import FeatureGrid from '../components/FeatureGrid.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { fabrication } from '../content/fabrication.js'
import './FabricationPage.css'

const ICONS = { Crosshair, Spline, Wrench }

export default function FabricationPage() {
  return (
    <main>
      <SEO
        title="Fabrication"
        description="Laser cutting, folding and custom metal fabrication in Dandenong South. Send us your design and we'll make it come to life — prototype to production."
        path="/fabrication"
      />
      <PageHero
        eyebrow={fabrication.header.eyebrow}
        title={fabrication.header.title}
        intro={fabrication.header.intro}
      />

      <section className="section">
        <div className="container grid grid--3">
          {fabrication.services.map((s) => {
            const Icon = ICONS[s.icon] || Wrench
            return (
              <div className="fab-service" key={s.title}>
                <span className="fab-service__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.7} />
                </span>
                <h3 className="fab-service__title">{s.title}</h3>
                <p className="fab-service__body">{s.body}</p>
                <ul className="fab-service__points">
                  {s.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <FeatureGrid
        eyebrow={fabrication.why.eyebrow}
        heading={fabrication.why.heading}
        items={fabrication.why.items}
      />

      <CtaBand />
    </main>
  )
}
