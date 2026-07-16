import { Link } from 'react-router-dom'
import { ShieldCheck, PencilRuler, Settings, ThumbsUp } from 'lucide-react'
import { whyChoose } from '../content/whyChoose.js'
import Eyebrow from './Eyebrow.jsx'
import './WhyChoose.css'

// Icons are named in content and resolved here so the content file stays free
// of imports.
const ICONS = { ShieldCheck, PencilRuler, Settings, ThumbsUp }

// Home "Why choose Urban" — dark band: a headline column beside a 4-up grid of
// bare, green-iconed feature blurbs.
export default function WhyChoose() {
  return (
    <section className="section section--dark why">
      <div className="container why__grid">
        <div className="why__intro">
          <Eyebrow>{whyChoose.eyebrow}</Eyebrow>
          <h2 className="h2 h2--md why__heading">{whyChoose.heading}</h2>
          <p className="why__body">{whyChoose.body}</p>
          <Link to={whyChoose.cta.to} className="btn btn--outline why__cta">
            {whyChoose.cta.label} →
          </Link>
        </div>

        <ul className="why__features">
          {whyChoose.items.map((item) => {
            const Icon = ICONS[item.icon] || ShieldCheck
            return (
              <li className="why__feature" key={item.title}>
                <span className="why__icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={1.6} />
                </span>
                <h3 className="why__feature-title">{item.title}</h3>
                <p className="why__feature-body">{item.body}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
