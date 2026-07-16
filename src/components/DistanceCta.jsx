import { Link } from 'react-router-dom'
import { distance } from '../content/distance.js'
import Eyebrow from './Eyebrow.jsx'
import './DistanceCta.css'

// Home "distance" band — a full-bleed lifestyle photo under a dark scrim with a
// short conversion message and a single outline CTA.
export default function DistanceCta() {
  return (
    <section className="distance" style={{ backgroundImage: `url(${distance.image})` }}>
      <div className="distance__scrim" aria-hidden="true" />
      <div className="container distance__inner">
        <Eyebrow>{distance.eyebrow}</Eyebrow>
        <h2 className="h2 h2--md distance__heading">{distance.heading}</h2>
        <p className="distance__body">{distance.body}</p>
        <Link to={distance.cta.to} className="btn distance__cta">
          {distance.cta.label} →
        </Link>
      </div>
    </section>
  )
}
