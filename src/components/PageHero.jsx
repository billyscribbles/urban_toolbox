import Eyebrow from './Eyebrow.jsx'
import './PageHero.css'

// Dark page-header band for inner pages. Renders the page-level <h1>.
// Pass `bgImage` to layer a photo behind the dark surface — a gradient scrim
// (see CSS) keeps text readable and weights the fade toward the copy side.
// `children` render below the intro, inside the container — the slot the
// fitment plate ("Fits all utes") uses on vehicle-exclusive category pages.
export default function PageHero({ eyebrow, title, intro, bgImage, children }) {
  const className = `page-hero${bgImage ? ' page-hero--photo' : ''}`
  const style = bgImage ? { '--page-hero-image': `url("${bgImage}")` } : undefined
  return (
    <section className={className} style={style}>
      <div className="container">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="page-hero__title">{title}</h1>
        {intro && <p className="page-hero__intro">{intro}</p>}
        {children}
      </div>
    </section>
  )
}
