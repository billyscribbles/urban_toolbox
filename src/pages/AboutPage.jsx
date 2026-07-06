import { MapPin, Phone, Mail } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import PageHero from '../components/PageHero.jsx'
import Placeholder from '../components/Placeholder.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { about } from '../content/about.js'
import './AboutPage.css'

const ICONS = { MapPin, Phone, Mail }

// Body for the three contact cards — address lines, phones or email.
function ContactCardBody({ card }) {
  if (card.phones) {
    return (
      <p className="about-contact__body">
        {card.phones.map((phone, i) => (
          <span key={phone}>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="about-contact__tel">
              {phone}
            </a>
            {i < card.phones.length - 1 && <br />}
          </span>
        ))}
      </p>
    )
  }
  if (card.email) {
    return (
      <p className="about-contact__body">
        <a href={`mailto:${card.email}`} className="about-contact__email">
          {card.email}
        </a>
        <br />
        {card.note}
      </p>
    )
  }
  return (
    <p className="about-contact__body">
      {card.lines.map((line, i) => (
        <span key={line}>
          {line}
          {i < card.lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  )
}

export default function AboutPage() {
  return (
    <main>
      <SEO
        title="About"
        description="Urban Toolboxes is a Dandenong South workshop building custom aluminium caravan toolboxes, ute accessories and fabrication. Australian made, built to last."
        path="/about"
      />
      <PageHero
        eyebrow={about.header.eyebrow}
        title={about.header.title}
        intro={about.header.intro}
      />

      <section className="section">
        <div className="container about-story">
          <Placeholder label={about.photo.label} height={380} />
          <div>
            <h2 className="h2 h2--md about-story__heading">{about.story.heading}</h2>
            {about.story.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="about-story__p">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt about-contact-section">
        <div className="container grid grid--3">
          {about.contact.map((card) => (
            <div className="about-contact" key={card.title}>
              <span className="about-contact__icon" aria-hidden="true" />
              <div className="about-contact__title">{card.title}</div>
              <ContactCardBody card={card} />
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  )
}
