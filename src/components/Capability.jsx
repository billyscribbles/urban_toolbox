import { Link } from 'react-router-dom'
import { capability } from '../content/capability.js'
import Eyebrow from './Eyebrow.jsx'
import Placeholder from './Placeholder.jsx'
import './Capability.css'

// Home "Services strip" — workshop photo beside three capability blurbs.
export default function Capability() {
  return (
    <section className="section">
      <div className="container capability__grid">
        <Placeholder label={capability.photo.label} sub={capability.photo.sub} height={380} />
        <div>
          <Eyebrow>{capability.eyebrow}</Eyebrow>
          <h2 className="h2 capability__heading">{capability.heading}</h2>
          <div className="capability__list">
            {capability.items.map((item) => (
              <div className="capability__item" key={item.title}>
                <h3 className="capability__item-title">{item.title}</h3>
                <p className="capability__item-body">{item.body}</p>
              </div>
            ))}
          </div>
          <Link to={capability.cta.to} className="action-link capability__cta">
            {capability.cta.label} →
          </Link>
        </div>
      </div>
    </section>
  )
}
