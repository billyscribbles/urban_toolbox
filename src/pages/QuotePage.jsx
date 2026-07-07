import { useState } from 'react'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import PageHero from '../components/PageHero.jsx'
import { quote } from '../content/quote.js'
import { site } from '../config/site.config.js'
import './QuotePage.css'

const { formspreeId } = site.integrations
// The template ships a placeholder ID; treat that (and an empty value) as "not
// wired up yet" so we never render a form that posts into the void.
const isConfigured = Boolean(formspreeId) && formspreeId !== 'your_formspree_form_id_here'
const ENDPOINT = `https://formspree.io/f/${formspreeId}`

const telHref = (phone) => `tel:${phone.replace(/\s/g, '')}`

// One form control, driven by its definition in content/quote.js.
function Field({ field }) {
  const common = {
    id: field.name,
    name: field.name,
    required: field.required,
    autoComplete: field.autoComplete,
  }
  return (
    <label className="quote-field" htmlFor={field.name}>
      <span className="quote-field__label">
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </span>
      {field.type === 'textarea' ? (
        <textarea {...common} rows={5} placeholder={field.placeholder} />
      ) : field.type === 'select' ? (
        <select {...common} defaultValue="">
          <option value="" disabled>
            Select one…
          </option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} type={field.type} placeholder={field.placeholder} />
      )}
    </label>
  )
}

// Address / phone / email / hours — the direct-contact fallback shown beside
// the form (and on its own when Formspree isn't configured yet).
function ContactAside() {
  const { contact } = site
  return (
    <aside className="quote-aside">
      <h2 className="quote-aside__heading">{quote.fallbackHeading}</h2>
      <ul className="quote-aside__list">
        <li>
          <Phone size={18} strokeWidth={1.7} aria-hidden="true" />
          <span>
            <a href={telHref(contact.phone)}>{contact.phone}</a>
            {contact.phoneAlt && (
              <>
                {' / '}
                <a href={telHref(contact.phoneAlt)}>{contact.phoneAlt}</a>
              </>
            )}
          </span>
        </li>
        <li>
          <Mail size={18} strokeWidth={1.7} aria-hidden="true" />
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </li>
        <li>
          <MapPin size={18} strokeWidth={1.7} aria-hidden="true" />
          <span>{contact.location}</span>
        </li>
        {contact.hours && (
          <li>
            <Clock size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>{contact.hours}</span>
          </li>
        )}
      </ul>
    </aside>
  )
}

export default function QuotePage() {
  // idle | submitting | success | error
  const [status, setStatus] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    setStatus('submitting')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setStatus('success')
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <main>
      <SEO
        title="Get a Quote"
        description="Request a free, no-obligation quote for a custom aluminium caravan toolbox, ute accessories or metal fabrication — built in Dandenong South, Victoria."
        path="/quote"
      />
      <PageHero
        eyebrow={quote.header.eyebrow}
        title={quote.header.title}
        intro={quote.header.intro}
      />

      <section className="section">
        <div className="container quote-layout">
          <div className="quote-form-col">
            {status === 'success' ? (
              <div className="quote-note quote-note--ok" role="status">
                <h2 className="quote-note__heading">{quote.success.heading}</h2>
                <p>{quote.success.body}</p>
              </div>
            ) : isConfigured ? (
              <form className="quote-form" onSubmit={handleSubmit} noValidate={false}>
                {/* Honeypot — real people never fill this; bots do. */}
                <input
                  type="text"
                  name="_gotcha"
                  tabIndex={-1}
                  autoComplete="off"
                  className="quote-honeypot"
                  aria-hidden="true"
                />
                <input type="hidden" name="_subject" value={quote.emailSubject} />

                {quote.fields.map((field) => (
                  <Field key={field.name} field={field} />
                ))}

                <div className="quote-form__footer">
                  <button
                    type="submit"
                    className="btn btn--green"
                    disabled={status === 'submitting'}
                  >
                    {status === 'submitting' ? quote.submittingLabel : quote.submitLabel} →
                  </button>
                  <p className="quote-form__aria" role="status" aria-live="polite">
                    {status === 'error' ? quote.error.body : ''}
                  </p>
                </div>

                {status === 'error' && (
                  <div className="quote-note quote-note--err">
                    <h2 className="quote-note__heading">{quote.error.heading}</h2>
                    <p>{quote.error.body}</p>
                  </div>
                )}
              </form>
            ) : (
              <div className="quote-note" role="status">
                <p>
                  Our online quote form is being set up. In the meantime, reach us directly using
                  the details opposite — we’ll get you a quote right away.
                </p>
              </div>
            )}
          </div>

          <ContactAside />
        </div>
      </section>
    </main>
  )
}
