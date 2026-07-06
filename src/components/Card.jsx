import { Link } from 'react-router-dom'
import Placeholder from './Placeholder.jsx'
import './Card.css'

// Product / category card: striped photo slot over a heading, body and an
// optional green action link. Becomes a link when `to` is provided.
export default function Card({
  ph,
  phSub,
  img,
  imgAlt,
  title,
  body,
  cta,
  to,
  height = 220,
  alt = false,
  titleSize = 24,
  pad = 28,
}) {
  const style = { '--card-title': `${titleSize}px`, '--card-pad': `${pad}px` }
  const inner = (
    <>
      <div className="card__media" style={{ height }}>
        {img ? (
          <img
            className={`card__img${to ? '' : ' zoomable'}`}
            src={img}
            alt={imgAlt || title}
            loading="lazy"
          />
        ) : (
          <Placeholder label={ph} sub={phSub} height={height} />
        )}
      </div>
      <div className="card__body">
        <h3 className="card__title">{title}</h3>
        <p className="card__text">{body}</p>
        {cta && <span className="action-link card__cta">{cta} →</span>}
      </div>
    </>
  )
  const className = `card${alt ? ' card--alt' : ''}${to ? ' card--link' : ''}`
  return to ? (
    <Link to={to} className={className} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={className} style={style}>
      {inner}
    </div>
  )
}
