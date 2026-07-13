import PageHero from './PageHero.jsx'
import Card from './Card.jsx'
import CtaBand from './CtaBand.jsx'
import './ProductRange.css'

// Section-driven product page. Renders a page hero, a sticky pill sub-nav built
// from each section's { id, label }, then one Card grid per section. Every
// section renders a fixed 3-per-row grid so product cards stay consistent
// site-wide. Shared by the Utes and Trucks ranges — the content file is the
// only thing that differs.
export default function ProductRange({ data }) {
  const { header, sections } = data
  return (
    <>
      <PageHero eyebrow={header.eyebrow} title={header.title} intro={header.intro} />

      <nav className="range-nav" aria-label={`${header.title} sections`}>
        <div className="container range-nav__inner">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="range-nav__pill">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {sections.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`section range-section${i % 2 ? ' section--alt' : ''}`}
        >
          <div className="container">
            <div className="section-head">
              <h2 className="h2 h2--md">{s.heading}</h2>
              {s.sub && <p className="section-head__sub">{s.sub}</p>}
            </div>
            <div className="grid grid--3">
              {s.products.map((p) => (
                <Card
                  key={p.title}
                  img={p.img}
                  imgAlt={p.imgAlt}
                  images={p.images}
                  imageFit={p.imageFit || s.imageFit}
                  imageTone={p.imageTone || s.imageTone}
                  imagePosition={p.imagePosition || s.imagePosition}
                  title={p.title}
                  body={p.body}
                  height={240}
                  titleSize={22}
                  pad={26}
                  alt
                  quote={p.quote}
                  quoteCategory={header.title}
                  build={s.build || data.build}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      {header.note && <p className="container range-note">{header.note}</p>}

      <CtaBand />
    </>
  )
}
