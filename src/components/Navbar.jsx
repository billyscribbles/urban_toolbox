import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { site } from '../config/site.config.js'
import { getMegaMenu, getVehicleMenu } from '../lib/catalog.js'
import { useQuote, openQuote } from '../lib/quoteStore.js'
import SmartLink from './SmartLink.jsx'
import './Navbar.css'

// One conversion control that folds the old "Quote [n]" tray pill into the
// primary CTA. Empty → link straight to the quote form. Has items → a button
// that opens the review tray (which then sends on to the form). The count badge
// only appears once something's been added, so the empty state reads as a plain
// "Get a Quote" button.
function QuoteCta({ cta, count, className, onNavigate }) {
  const label = (
    <>
      {cta.label}
      {count > 0 && <span className="navbar__cta-count">{count}</span>}
    </>
  )

  if (count > 0) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          openQuote()
          onNavigate?.()
        }}
        aria-label={`${cta.label}, ${count} item${count === 1 ? '' : 's'} in your list`}
      >
        {label}
      </button>
    )
  }

  return (
    <SmartLink to={cta.href} className={className} onClick={onNavigate}>
      {label}
    </SmartLink>
  )
}

function Brand({ brand }) {
  if (brand.logoSrc) {
    return <img src={brand.logoSrc} alt={brand.name} className="navbar__logo-img" />
  }
  return (
    <>
      {brand.logoMark && (
        <img
          src={brand.logoMark}
          alt=""
          width={60}
          height={60}
          className="navbar__logo-mark"
          aria-hidden="true"
        />
      )}
      <span className="navbar__logo-lockup">
        <span className="navbar__logo-word">{brand.logoText}</span>
        {brand.logoSub && <span className="navbar__logo-sub">{brand.logoSub}</span>}
      </span>
    </>
  )
}

// The contents of an open desktop dropdown. Catalog panels (Toolboxes,
// Accessories) stay a compact list of topic links only — leaf categories
// surface on each category page's pill sub-nav. A panel flagged `listItems`
// (Shop by Vehicle) also renders each column's items downwards under its
// heading (Caravans / Utes → the groups their pages offer).
function MegaPanel({ panel, onNavigate }) {
  return (
    <div className="navbar__mega-inner">
      {panel.showAll && (
        <Link to={panel.to} className="navbar__mega-all" onClick={onNavigate}>
          View all {panel.label}
        </Link>
      )}
      <div className="navbar__mega-list">
        {panel.columns.map((col) => (
          <div key={col.to} className="navbar__mega-col">
            <Link to={col.to} className="navbar__mega-topic" onClick={onNavigate}>
              {col.label}
            </Link>
            {panel.listItems && col.items.length > 0 && (
              <ul className="navbar__mega-items">
                {col.items.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="navbar__mega-item" onClick={onNavigate}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false) // mobile hamburger
  const [openMenu, setOpenMenu] = useState(null) // desktop dropdown slug
  const [openSection, setOpenSection] = useState(null) // mobile accordion slug
  const [scrolled, setScrolled] = useState(false) // past the top of the page
  const { pathname } = useLocation()
  const { brand, nav, cta } = site
  const { items } = useQuote()
  const quoteCount = items.length
  const listRef = useRef(null)

  // Resolve each nav item to its dropdown panel once (a null panel = flat link).
  // 'vehicle' is the hand-built Caravans/Utes menu; everything else is catalog-driven.
  const resolvePanel = (menu) => (menu === 'vehicle' ? getVehicleMenu() : getMegaMenu(menu))
  const navItems = nav.map((l) => ({ ...l, panel: l.menu ? resolvePanel(l.menu) : null }))

  // The home page has a full-bleed dark hero behind the bar, so the navbar
  // rides transparent over it and only fills in once the user scrolls (or
  // opens the mobile menu). Every other route keeps the solid bar.
  const overHero = pathname === '/'
  const transparent = overHero && !scrolled && !menuOpen

  // Close every menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
    setOpenMenu(null)
    setOpenSection(null)
  }, [pathname])

  // Track whether the page has scrolled past the top, but only on routes that
  // ride transparent over a hero — elsewhere the bar is always solid.
  useEffect(() => {
    if (!overHero) {
      setScrolled(false)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll() // sync on mount / when returning to an already-scrolled home
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  // Esc closes an open dropdown; pointerdown outside the nav closes it too.
  useEffect(() => {
    if (!openMenu) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    const onDown = (e) => {
      if (listRef.current && !listRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [openMenu])

  return (
    <header className={`navbar${transparent ? ' navbar--transparent' : ''}`}>
      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo" aria-label={brand.name}>
          <Brand brand={brand} />
        </Link>

        <nav className="navbar__links" aria-label="Main navigation">
          <ul className="navbar__list" ref={listRef}>
            {navItems.map((l) =>
              l.panel ? (
                <li
                  key={l.to}
                  className="navbar__item navbar__item--mega"
                  onMouseEnter={() => setOpenMenu(l.menu)}
                  onMouseLeave={() => setOpenMenu((cur) => (cur === l.menu ? null : cur))}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setOpenMenu((cur) => (cur === l.menu ? null : cur))
                    }
                  }}
                >
                  <span className="navbar__mega-trigger">
                    <NavLink
                      to={l.to}
                      className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
                      onFocus={() => setOpenMenu(l.menu)}
                    >
                      {l.label}
                    </NavLink>
                    <button
                      type="button"
                      className="navbar__mega-toggle"
                      aria-expanded={openMenu === l.menu}
                      aria-controls={`megapanel-${l.menu}`}
                      aria-label={`${l.label} menu`}
                      onFocus={() => setOpenMenu(l.menu)}
                      onClick={() => setOpenMenu((cur) => (cur === l.menu ? null : l.menu))}
                    >
                      <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </span>
                  {/* CSS-animated dropdown (see navbar__mega-panel in the CSS).
                      This deliberately avoids framer-motion so the library stays
                      out of the home route's initial bundle — the enter uses a
                      keyframe; closing is instant, which reads fine for a hover
                      menu. */}
                  {openMenu === l.menu && (
                    <div
                      id={`megapanel-${l.menu}`}
                      className="navbar__mega-panel"
                      role="group"
                      aria-label={l.label}
                    >
                      <MegaPanel panel={l.panel} onNavigate={() => setOpenMenu(null)} />
                    </div>
                  )}
                </li>
              ) : (
                <li key={l.to} className="navbar__item">
                  <NavLink
                    to={l.to}
                    end={l.to === '/'}
                    className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
                  >
                    {l.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>

        <QuoteCta cta={cta} count={quoteCount} className="navbar__cta" />

        <button
          className={`navbar__hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className={`navbar__mobile${menuOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        {navItems.map((l) =>
          l.panel ? (
            <div key={l.to} className="navbar__mobile-group">
              <div className="navbar__mobile-row">
                <NavLink
                  to={l.to}
                  className={({ isActive }) => `navbar__mobile-link${isActive ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </NavLink>
                <button
                  type="button"
                  className={`navbar__mobile-toggle${openSection === l.menu ? ' open' : ''}`}
                  aria-expanded={openSection === l.menu}
                  aria-controls={`mobilesec-${l.menu}`}
                  aria-label={`${l.label} categories`}
                  onClick={() => setOpenSection((cur) => (cur === l.menu ? null : l.menu))}
                >
                  <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              {openSection === l.menu && (
                <ul id={`mobilesec-${l.menu}`} className="navbar__mobile-sub">
                  {l.panel.columns.map((col) => (
                    <li key={col.to}>
                      <Link
                        to={col.to}
                        className="navbar__mobile-sublink"
                        onClick={() => setMenuOpen(false)}
                      >
                        {col.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `navbar__mobile-link${isActive ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ),
        )}
        <QuoteCta
          cta={cta}
          count={quoteCount}
          className="navbar__mobile-cta"
          onNavigate={() => setMenuOpen(false)}
        />
      </nav>
    </header>
  )
}
