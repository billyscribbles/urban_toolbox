import { Link } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import './NotFoundPage.css'

export default function NotFoundPage() {
  return (
    <main className="notfound">
      <SEO title="Page not found" />
      <div className="container notfound__inner">
        <span className="section-eyebrow">404</span>
        <h1 className="notfound__title">Page not found.</h1>
        <p className="notfound__sub">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="notfound__cta">
          ← Back home
        </Link>
      </div>
    </main>
  )
}
