import Eyebrow from './Eyebrow.jsx'
import './PageHero.css'

// Dark page-header band for inner pages. Renders the page-level <h1>.
export default function PageHero({ eyebrow, title, intro }) {
  return (
    <section className="page-hero">
      <div className="container">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="page-hero__title">{title}</h1>
        {intro && <p className="page-hero__intro">{intro}</p>}
      </div>
    </section>
  )
}
