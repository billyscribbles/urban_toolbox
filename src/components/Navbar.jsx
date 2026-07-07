import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { site } from '../config/site.config.js'
import SmartLink from './SmartLink.jsx'
import './Navbar.css'

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

        <SmartLink to={cta.href} className="navbar__cta">
          {cta.label}
        </SmartLink>

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
        <SmartLink to={cta.href} className="navbar__mobile-cta" onClick={() => setMenuOpen(false)}>
          {cta.label}
        </SmartLink>
      </nav>
    </header>
  )
}
