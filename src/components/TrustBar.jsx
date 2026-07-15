import { MapPin, ShieldCheck, PencilRuler } from 'lucide-react'
import { stats } from '../content/stats.js'
import './TrustBar.css'

// Dark strip below the hero: three trust cells with bare green outline icons.
const ICONS = [MapPin, ShieldCheck, PencilRuler]

export default function TrustBar() {
  return (
    <section className="trust">
      <div className="container">
        <div className="trust__card">
          {stats.map((item, i) => {
            const Icon = ICONS[i % ICONS.length]
            return (
              <div className="trust__cell" key={item.value}>
                <span className="trust__icon" aria-hidden="true">
                  <Icon size={24} strokeWidth={1.7} />
                </span>
                <div className="trust__text">
                  <div className="trust__title">{item.value}</div>
                  <div className="trust__sub">{item.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
