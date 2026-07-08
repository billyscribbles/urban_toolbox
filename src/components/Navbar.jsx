import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../config/site.config.js'
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

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { brand, nav, cta } = site
  const { items } = useQuote()
  const quoteCount = items.length

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo" aria-label={brand.name}>
          <Brand brand={brand} />
        </Link>

        <nav className="navbar__links" aria-label="Main navigation">
          {nav.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
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
        {nav.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `navbar__mobile-link${isActive ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </NavLink>
        ))}
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
