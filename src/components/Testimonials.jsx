import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { testimonials } from '../content/testimonials.js'
import useScrollPager from '../hooks/useScrollPager.js'
import Eyebrow from './Eyebrow.jsx'
import './Testimonials.css'

// Initials monogram in place of a stock face — honest and on-brand, and it
// keeps the page free of fabricated portrait photography.
function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Home "testimonials" — a paged scroll-snap row of review cards, each with a
// green star rating, the quote and a monogram + name/role footer.
export default function Testimonials() {
  const { ref, pageCount, prev, next, canPrev, canNext } = useScrollPager()

  return (
    <section className="section section--alt tm">
      <div className="container">
        <div className="tm__head">
          <div>
            <Eyebrow>{testimonials.eyebrow}</Eyebrow>
            <h2 className="h2 h2--md tm__heading">{testimonials.heading}</h2>
          </div>
          {pageCount > 1 && (
            <div className="tm__arrows">
              <button
                type="button"
                className="tm__arrow"
                onClick={prev}
                disabled={!canPrev}
                aria-label="Previous testimonials"
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="tm__arrow"
                onClick={next}
                disabled={!canNext}
                aria-label="Next testimonials"
              >
                <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <ul className="tm__track" ref={ref}>
          {testimonials.items.map((item) => (
            <li className="tm__item" key={item.author}>
              <figure className="tm__card">
                <div className="tm__stars" role="img" aria-label={`${item.rating} out of 5 stars`}>
                  {Array.from({ length: item.rating }, (_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill="currentColor"
                      strokeWidth={0}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="tm__quote">“{item.quote}”</blockquote>
                <figcaption className="tm__author">
                  <span className="tm__avatar" aria-hidden="true">
                    {initials(item.author)}
                  </span>
                  <span className="tm__author-meta">
                    <span className="tm__name">{item.author}</span>
                    <span className="tm__role">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
