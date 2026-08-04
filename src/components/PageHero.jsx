import Eyebrow from './Eyebrow.jsx'
import './PageHero.css'

// Dark page-header band for inner pages. Renders the page-level <h1>.
// Pass `bgImage` to layer a photo behind the dark surface — a gradient scrim
// (see CSS) keeps text readable and weights the fade toward the copy side.
// `bgSize`/`bgPosition` override the default `cover`/`center right` framing
// per photo (e.g. "auto 125%" to zoom out and show the whole vehicle).
// `bgWidth` widens the masked photo layer beyond its default 62%,
// `bgOpacity` dims the photo into a backdrop wash so it can run further
// across the band without fighting the copy, and `bgFade` swaps the
// left-edge falloff gradient (see --page-hero-fade in the CSS).
// `children` render below the intro, inside the container — the slot the
// fitment plate ("Fits all utes") uses on vehicle-exclusive category pages.
export default function PageHero({
  eyebrow,
  title,
  intro,
  bgImage,
  bgSize,
  bgPosition,
  bgWidth,
  bgOpacity,
  bgFade,
  children,
}) {
  const className = `page-hero${bgImage ? ' page-hero--photo' : ''}`
  const style = bgImage
    ? {
        '--page-hero-image': `url("${bgImage}")`,
        ...(bgSize && { '--page-hero-size': bgSize }),
        ...(bgPosition && { '--page-hero-pos': bgPosition }),
        ...(bgWidth && { '--page-hero-width': bgWidth }),
        ...(bgOpacity != null && { '--page-hero-opacity': bgOpacity }),
        ...(bgFade && { '--page-hero-fade': bgFade }),
      }
    : undefined
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
