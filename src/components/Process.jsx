import { howItWorks } from '../content/howItWorks.js'
import Eyebrow from './Eyebrow.jsx'
import Placeholder from './Placeholder.jsx'
import './Process.css'

// Home "Process" — three numbered steps on the dark band.
export default function Process() {
  return (
    <section className="section section--dark">
      <div className="container">
        <div className="section-head">
          <Eyebrow>{howItWorks.eyebrow}</Eyebrow>
          <h2 className="h2">{howItWorks.heading}</h2>
          <p className="section-head__sub">{howItWorks.sub}</p>
        </div>
        <div className="grid grid--3">
          {howItWorks.steps.map((step) => (
            <div className="process__step" key={step.number}>
              <div className="process__media">
                {step.img ? (
                  <img
                    className="process__img zoomable"
                    src={step.img}
                    alt={step.imgAlt || step.title}
                    loading="lazy"
                  />
                ) : (
                  <Placeholder label={step.ph} dark />
                )}
              </div>
              <div className="process__step-num">Step {step.number}</div>
              <h3 className="process__step-title">{step.title}</h3>
              <p className="process__step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
