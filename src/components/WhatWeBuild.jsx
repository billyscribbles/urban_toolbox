import { services } from '../content/services.js'
import Eyebrow from './Eyebrow.jsx'
import Card from './Card.jsx'

// Home "What we build" — three linked category cards on the off-white band.
export default function WhatWeBuild() {
  return (
    <section className="section section--alt">
      <div className="container">
        <div className="section-head">
          <Eyebrow>{services.eyebrow}</Eyebrow>
          <h2 className="h2">{services.heading}</h2>
        </div>
        <div className="grid grid--3">
          {services.items.map((s) => (
            <Card
              key={s.title}
              ph={s.ph}
              phSub={s.phSub}
              img={s.img}
              imgAlt={s.imgAlt}
              imageFit={s.imageFit}
              imageTone={s.imageTone}
              imagePosition={s.imagePosition}
              title={s.title}
              body={s.body}
              cta={s.cta}
              to={s.to}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
