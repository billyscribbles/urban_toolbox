import { Fragment, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import PageHero from './PageHero.jsx'
import Card from './Card.jsx'
import CtaBand from './CtaBand.jsx'
import FitmentBadge from './FitmentBadge.jsx'
import { filterSections } from '../lib/productSearch.js'
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

// Title-keyword filter box riding inside the sticky sub-nav, ahead of the
// category tabs, so it stays pinned while scrolling. Plain controlled input —
// the catalog is small enough that filtering on every keystroke is free.
function RangeSearch({ query, onChange }) {
  return (
    <div className="range-search__box" role="search">
      <Search size={16} strokeWidth={2.5} className="range-search__icon" aria-hidden="true" />
      <input
        type="search"
        className="range-search__input"
        placeholder="Search products…"
        aria-label="Search products"
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
      {query && (
        <button
          type="button"
          className="range-search__clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// The sticky category sub-nav, with the search box leading its first row. A
// single category (CategoryPage) shows a flat always-visible pill row. Vehicle
// pages span multiple top categories, so their nav is a row of "Toolboxes" /
// "Accessories" buttons — one open at a time — each revealing that group's
// category pills below. A group that is one bare category (vehicle-exclusive
// tops like Trays) renders as a direct anchor beside the group buttons instead
// of a one-pill dropdown.
const isSoloGroup = (g) => g.sections.length === 1 && g.sections[0].label === g.label

function RangeNav({ title, sections, query, onQueryChange }) {
  const [openLabel, setOpenLabel] = useState(null)
  const groups = sections.some((s) => s.group) ? groupSections(sections) : null

  if (!groups) {
    return (
      <nav className="range-nav" aria-label={`${title} sections`}>
        <div className="container range-nav__inner">
          <RangeSearch query={query} onChange={onQueryChange} />
          {sections.map((s) => (
            <Pill key={s.id} section={s} />
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav
      className="range-nav"
      aria-label={`${title} sections`}
      onMouseLeave={() => setOpenLabel(null)}
    >
      <div className="container">
        <div className="range-nav__toggles">
          <RangeSearch query={query} onChange={onQueryChange} />
          {groups.map((g, i) => {
            if (isSoloGroup(g)) {
              return (
                <a
                  key={g.label}
                  href={`#${g.sections[0].id}`}
                  className="range-nav__toggle"
                  onClick={() => setOpenLabel(null)}
                >
                  {g.label}
                </a>
              )
            }
            const open = openLabel === g.label
            return (
              <button
                key={g.label}
                type="button"
                className="range-nav__toggle"
                aria-expanded={open}
                aria-controls={`range-nav-panel-${i}`}
                onMouseEnter={() => setOpenLabel(g.label)}
                onClick={() => setOpenLabel(open ? null : g.label)}
              >
                {g.label}
                <ChevronDown
                  size={18}
                  strokeWidth={2.5}
                  className="range-nav__chevron"
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
        {groups.map((g, i) =>
          isSoloGroup(g) ? null : (
            <div
              key={g.label}
              id={`range-nav-panel-${i}`}
              className="range-nav__panel"
              hidden={openLabel !== g.label}
            >
              <div className="range-nav__pills">
                {g.sections.map((s) => (
                  <Pill key={s.id} section={s} onNavigate={() => setOpenLabel(null)} />
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </nav>
  )
}

export default function ProductRange({ data, status = 'ready', onRetry }) {
  const { header, sections } = data
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const visible = filterSections(sections, query)
  const matchCount = visible.reduce((n, s) => n + s.products.length, 0)
  return (
    <>
      <PageHero
        eyebrow={header.eyebrow}
        title={header.title}
        intro={header.intro}
        bgImage={header.bgImage}
        bgSize={header.bgSize}
        bgPosition={header.bgPosition}
        bgWidth={header.bgWidth}
        bgOpacity={header.bgOpacity}
        bgFade={header.bgFade}
      >
        {/* `header.fitment` is the category's vehicle scope — set only on the
            vehicle-exclusive tops (Trays, Canopy, Service Canopy; Truck
            Toolboxes, Truck Accessories), where "does it fit my ute/truck?"
            is the first thing a visitor wants answered. */}
        {header.fitment && <FitmentBadge vehicle={header.fitment} />}
      </PageHero>

      <RangeNav title={header.title} sections={sections} query={query} onQueryChange={setQuery} />

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
        <>
          {/* Always-mounted live region so screen readers hear count changes;
              empty text collapses to zero height when not searching. */}
          <p className="container range-search__count" role="status">
            {searching && (matchCount === 1 ? '1 product matches' : `${matchCount} products match`)}
          </p>
          {searching && visible.length === 0 ? (
            <section className="section range-section">
              <div className="container range-search__empty">
                <p className="range-status__text">
                  No products match “{query.trim()}”. Try a different keyword.
                </p>
                <button type="button" className="range-status__retry" onClick={() => setQuery('')}>
                  Clear search
                </button>
              </div>
            </section>
          ) : (
            visible.map((s, i) => (
              <Fragment key={s.id}>
                {/* Zero-height anchor ahead of the first section of each vehicle-
                    page group — the nav's deep links (/utes#toolboxes) land on it
                    with the same sticky-bar clearance as a section jump (it shares
                    .range-section's scroll-margin). Solo groups already use the
                    section id itself. */}
                {s.groupSlug &&
                  s.groupSlug !== s.id &&
                  visible.findIndex((x) => x.groupSlug === s.groupSlug) === i && (
                    <div id={s.groupSlug} className="range-group-anchor" aria-hidden="true" />
                  )}
                <section
                  id={s.id}
                  className={`section range-section${i % 2 ? ' section--alt' : ''}`}
                >
                  <div className="container">
                    <div className="section-head">
                      <h2 className="h2 h2--md">{s.heading}</h2>
                      {/* Vehicle pages carry these categories as sections rather
                      than their own hero, so the fitment answer rides on the
                      heading instead of the plate. */}
                      {s.fitment && <FitmentBadge vehicle={s.fitment} variant="inline" />}
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
              </Fragment>
            ))
          )}
        </>
      )}

      {header.note && <p className="container range-note">{header.note}</p>}

      <CtaBand />
    </>
  )
}
