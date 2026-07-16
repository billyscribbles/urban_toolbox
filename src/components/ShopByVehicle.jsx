import { Link } from 'react-router-dom'
import { shopByVehicle } from '../content/shopByVehicle.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import './ShopByVehicle.css'

// Home "shop by vehicle" band — two full-bleed image cards that route to the
// /utes and /caravans explore pages. Reads every string/asset from content so
// the component stays a dumb layout. The hero derivatives ship at 800/1600.
const CARD_SIZES = '(max-width: 700px) 100vw, 50vw'
const CARD_WIDTHS = [800, 1600]

export default function ShopByVehicle() {
  return (
    <section className="section vehicles">
      <div className="container">
        <div className="vehicles__head">
          <Eyebrow>{shopByVehicle.eyebrow}</Eyebrow>
          <h2 className="h2 h2--md vehicles__heading">{shopByVehicle.heading}</h2>
        </div>
        <div className="vehicles__grid">
          {shopByVehicle.cards.map((card) => (
            <Link key={card.to} to={card.to} className="vehicles__card">
              <span className="vehicles__media">
                <Img
                  className="vehicles__img"
                  src={card.img}
                  alt=""
                  sizes={CARD_SIZES}
                  widths={CARD_WIDTHS}
                  width={1600}
                  height={1000}
                />
              </span>
              <span className="vehicles__scrim" aria-hidden="true" />
              <span className="vehicles__body">
                <span className="vehicles__label">{card.label}</span>
                <span className="vehicles__sub">{card.sub}</span>
                <span className="vehicles__cta">Explore →</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
