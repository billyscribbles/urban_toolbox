import Eyebrow from './Eyebrow.jsx'
import './FeatureGrid.css'

// Off-white 4-up feature grid. `boxed` renders each feature in a bordered card
// ("Built into every box"); unboxed renders bare features ("Why choose us").
export default function FeatureGrid({ eyebrow, heading, items, boxed = false }) {
  return (
    <section className="section section--alt feature-grid">
      <div className="container">
        <div className="section-head">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className="h2 h2--md">{heading}</h2>
        </div>
        <div className="grid grid--4">
          {items.map((item) => (
            <div className={`feature${boxed ? ' feature--boxed' : ''}`} key={item.title}>
              <div className="feature__title">{item.title}</div>
              <p className="feature__body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
