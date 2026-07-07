import { cta } from '../content/cta.js'
import SmartLink from './SmartLink.jsx'
import './CtaBand.css'

// Full-width green conversion band, reused at the foot of every page.
// `sub` overrides the default subhead (the home page uses the longer variant).
export default function CtaBand({ sub = cta.sub }) {
  return (
    <section className="cta-band">
      <div className="container cta-band__inner">
        <div>
          <h2 className="cta-band__heading">{cta.heading}</h2>
          <p className="cta-band__sub">{sub}</p>
        </div>
        <SmartLink to={cta.button.href} className="btn btn--dark">
          {cta.button.label} →
        </SmartLink>
      </div>
    </section>
  )
}
