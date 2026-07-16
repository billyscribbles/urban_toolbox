import { site } from '../config/site.config.js'
import SmartLink from './SmartLink.jsx'
import './Footer.css'

// A footer link carries either an internal route (`to`) or an external/mailto
// (`href`); SmartLink renders the right element for whichever is set.
function FooterLink({ link }) {
  return (
    <SmartLink to={link.href || link.to} className="footer__link">
      {link.label}
    </SmartLink>
  )
}

export default function Footer() {
  const { brand, footer, contact } = site
  const telHref = (phone) => `tel:${phone.replace(/\s/g, '')}`

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__main">
          <div className="footer__brand">
            <div className="footer__lockup">
              {brand.logoMark && (
                <img
                  src={brand.logoMark}
                  alt=""
                  width={54}
                  height={54}
                  className="footer__logo-mark"
                  aria-hidden="true"
                />
              )}
              <span className="footer__logo-col">
                <span className="footer__logo-word">{brand.logoText}</span>
                {brand.logoSub && <span className="footer__logo-sub">{brand.logoSub}</span>}
              </span>
            </div>
            <p className="footer__blurb">{brand.tagline}</p>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title} className="footer__col">
              <div className="footer__col-title">{col.title}</div>
              <ul className="footer__links">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <FooterLink link={l} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="footer__col">
            <div className="footer__col-title">Get in Touch</div>
            <p className="footer__contact">
              {contact.location}
              <br />
              {contact.phone && (
                <a href={telHref(contact.phone)} className="footer__contact-link">
                  {contact.phone}
                </a>
              )}
              {contact.phoneAlt && (
                <>
                  {' / '}
                  <a href={telHref(contact.phoneAlt)} className="footer__contact-link">
                    {contact.phoneAlt}
                  </a>
                </>
              )}
              <br />
              <a href={`mailto:${contact.email}`} className="footer__email">
                {contact.email}
              </a>
            </p>
          </div>
        </div>

        <div className="footer__bottom">
          <span className="footer__meta footer__meta--copy">
            {footer.copyright}
            {footer.legal?.length > 0 && (
              <span className="footer__legal">
                {footer.legal.map((l) => (
                  <SmartLink key={l.to || l.href} to={l.href || l.to} className="footer__legal-link">
                    {l.label}
                  </SmartLink>
                ))}
              </span>
            )}
          </span>
          <span className="footer__meta footer__meta--right">
            {footer.madeLine}
            {footer.credit && (
              <>
                <span className="footer__dot" aria-hidden="true">
                  ·
                </span>
                <a
                  href={footer.credit.href}
                  className="footer__credit"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {footer.credit.label}
                </a>
              </>
            )}
          </span>
        </div>
      </div>
    </footer>
  )
}
