import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import PageHero from './PageHero.jsx'
import Card from './Card.jsx'
import CtaBand from './CtaBand.jsx'
import './ProductRange.css'

// Section-driven product page. Renders a page hero, a sticky sub-nav built from
// each section's { id, label }, then one Card grid per section. Every section
// renders a fixed 3-per-row grid so product cards stay consistent site-wide.
function Pill({ section, onNavigate }) {
  return (
    <a href={`#${section.id}`} className="range-nav__pill" onClick={onNavigate}>
      {section.label}
    </a>
  )
}

// Collapse a flat section list into ordered { label, sections } groups keyed by
// each section's `group`, preserving first-seen order (Toolboxes then Accessories).
function groupSections(sections) {
  const groups = []
  for (const s of sections) {
    const existing = groups.find((g) => g.label === s.group)
    if (existing) existing.sections.push(s)
    else groups.push({ label: s.group, sections: [s] })
  }
  return groups
}

// The sticky category sub-nav. A single category (CategoryPage) shows a flat
// always-visible pill row. Vehicle pages span two categories, so their nav
// collapses behind a "Browse by category" toggle to stay clean — expanded, the
// pills split into labelled Toolboxes / Accessories groups.
function RangeNav({ title, sections }) {
  const [open, setOpen] = useState(false)
  const groups = sections.some((s) => s.group) ? groupSections(sections) : null

  if (!groups) {
    return (
      <nav className="range-nav" aria-label={`${title} sections`}>
        <div className="container range-nav__inner">
          {sections.map((s) => (
            <Pill key={s.id} section={s} />
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav className="range-nav" aria-label={`${title} sections`}>
      <div className="container">
        <button
          type="button"
          className="range-nav__toggle"
          aria-expanded={open}
          aria-controls="range-nav-panel"
          onClick={() => setOpen((v) => !v)}
        >
          Browse by category
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            className="range-nav__chevron"
            aria-hidden="true"
          />
        </button>
        <div id="range-nav-panel" className="range-nav__panel" hidden={!open}>
          {groups.map((g) => (
            <div className="range-nav__group" key={g.label}>
              <span className="range-nav__group-label">{g.label}</span>
              <div className="range-nav__pills">
                {g.sections.map((s) => (
                  <Pill key={s.id} section={s} onNavigate={() => setOpen(false)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default function ProductRange({ data, status = 'ready', onRetry }) {
  const { header, sections } = data
  return (
    <>
      <PageHero eyebrow={header.eyebrow} title={header.title} intro={header.intro} />

      <RangeNav title={header.title} sections={sections} />

      {status !== 'ready' ? (
        <section className="section range-section">
          <div className="container">
            {status === 'error' ? (
              <div className="range-status range-status--error" role="alert">
                <p className="range-status__text">
                  The product catalogue couldn’t load. Check your connection and try again.
                </p>
                <button type="button" className="range-status__retry" onClick={onRetry}>
                  Retry
                </button>
              </div>
            ) : (
              <div className="range-status" role="status" aria-label="Loading products">
                <div className="grid grid--3 range-grid">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="range-skeleton" aria-hidden="true" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        sections.map((s, i) => (
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
              <div className="grid grid--3 range-grid">
                {s.products.map((p) => (
                  <Card
                    key={p.id || p.title}
                    slug={p.slug}
                    img={p.img}
                    imgAlt={p.imgAlt}
                    images={p.images}
                    imageFit={p.imageFit || s.imageFit}
                    imageTone={p.imageTone || s.imageTone}
                    imagePosition={p.imagePosition || s.imagePosition}
                    title={p.title}
                    body={p.summary || p.body}
                    height={240}
                    titleSize={22}
                    pad={26}
                    alt
                    quote={p.quote}
                    price={p.price}
                    discountPct={p.discountPct}
                    quoteCategory={header.title}
                  />
                ))}
              </div>
            </div>
          </section>
        ))
      )}

      {header.note && <p className="container range-note">{header.note}</p>}

      <CtaBand />
    </>
  )
}
