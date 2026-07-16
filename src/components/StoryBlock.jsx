import { Link } from 'react-router-dom'
import { MapPin, Award, Users } from 'lucide-react'
import { story } from '../content/story.js'
import Eyebrow from './Eyebrow.jsx'
import Img from './Img.jsx'
import './StoryBlock.css'

const ICONS = { MapPin, Award, Users }

// Home "story" block — a monochrome workshop photo (linking through to the
// About page) beside an about-us intro with three proof stats.
export default function StoryBlock() {
  return (
    <section className="section story">
      <div className="container story__grid">
        <div className="story__media">
          <Img
            className="story__img"
            src={story.media.img}
            alt={story.media.imgAlt}
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        </div>

        <div className="story__body">
          <Eyebrow>{story.eyebrow}</Eyebrow>
          <h2 className="h2 h2--md story__heading">{story.heading}</h2>
          <p className="story__text">{story.body}</p>

          <ul className="story__stats">
            {story.stats.map((stat) => {
              const Icon = ICONS[stat.icon] || MapPin
              return (
                <li className="story__stat" key={stat.value}>
                  <span className="story__stat-icon" aria-hidden="true">
                    <Icon size={24} strokeWidth={1.6} />
                  </span>
                  <span className="story__stat-value">{stat.value}</span>
                  <span className="story__stat-label">{stat.label}</span>
                </li>
              )
            })}
          </ul>

          <Link to={story.cta.to} className="btn btn--dark story__cta">
            {story.cta.label} →
          </Link>
        </div>
      </div>
    </section>
  )
}
