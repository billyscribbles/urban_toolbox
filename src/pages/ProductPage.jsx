import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, ShieldCheck, Package, PhoneCall } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import ProductGallery from '../components/ProductGallery.jsx'
import RelatedProducts from '../components/RelatedProducts.jsx'
import PriceTag from '../components/PriceTag.jsx'
import QuoteButton from '../components/QuoteButton.jsx'
import ColorSelector from '../components/ColorSelector.jsx'
import CtaBand from '../components/CtaBand.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import {
  getProductByToken,
  getCategoryById,
  getCategoryPath,
  getTopLabelForProduct,
} from '../lib/catalog.js'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'
import './ProductPage.css'

// A breadcrumb crumb's link target, mirroring how the mega-menu links categories:
// the top category and Toolboxes subcategories are their own pages; a leaf under
// Toolboxes anchors into its subcategory page; every Accessories leaf anchors
// into the flattened Accessories page.
function crumbHref(node, i, path) {
  const top = path[0]
  if (i === 0) return `/${top.slug}`
  if (top.slug === 'accessories') return `/accessories#${node.slug}`
  if (i === 1) return `/toolboxes/${node.slug}`
  return `/toolboxes/${path[i - 1].slug}#${node.slug}`
}

// Simplified Australia silhouette — lucide has no country shapes, so this keeps
// the "Australian made" trust cell literal. Drawn to match the site's green
// outline icon style.
function AustraliaIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.8 5.4 8.9 7.2 10.2 4.6 12 6.4 14.6 5.8 18 7.6 19.4 11.4 18.6 15 16.2 17.2 13 18.2 11.2 16.9 8.6 18.2 5.6 16 3.7 11.8 4.4 8.1 Z" />
      <circle cx="15.2" cy="20.2" r="1.1" />
    </svg>
  )
}

// Static trust signals for the buy box — presentational microcopy, so they
// live here rather than in a content file.
const TRUST = [
  { Icon: ShieldCheck, title: 'Built to Last', sub: 'Premium materials' },
  { Icon: Package, title: 'Made to Fit', sub: 'Built for your setup' },
  { Icon: AustraliaIcon, title: 'Australian Made', sub: 'Proudly fabricated' },
]

// Real, shareable product page — replaces the old ?product= detail drawer.
// Resolves the product from the URL token (slug or id), then lays it out like a
// standard storefront PDP: gallery + buy box, a description block, and a
// related-products rail. Every value comes from the normalized catalog product;
// this page stays dumb.
export default function ProductPage() {
  const { slug } = useParams()
  const { status } = useProductCatalog()
  useEffect(() => {
    loadProducts()
  }, [])

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="section">
        <div className="container">
          <div className="product-page__loading" role="status" aria-label="Loading product">
            <div className="product-page__loading-media" aria-hidden="true" />
            <div className="product-page__loading-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="section">
        <div className="container">
          <div className="product-page__error" role="alert">
            <p className="product-page__error-text">
              This product couldn’t load. Check your connection and try again.
            </p>
            <button type="button" className="product-page__retry" onClick={retryLoad}>
              Retry
            </button>
          </div>
        </div>
      </main>
    )
  }

  const product = getProductByToken(slug)
  if (!product) return <NotFoundPage />

  return <ProductDetail product={product} />
}

// Renders a resolved product. Split from ProductPage so the colour selection
// can live in local state without hooks sitting behind the loading/404 guards.
function ProductDetail({ product }) {
  // Pre-select the first available colour; null when the product has none, in
  // which case no selector renders and no colour rides into the quote.
  const [color, setColor] = useState(() => product.colors?.[0] ?? null)

  const leaf = getCategoryById(product.categoryId)
  const path = leaf ? getCategoryPath(leaf.slug) : []
  const topLabel = getTopLabelForProduct(product)
  // Ute-exclusive tops (Trays, Canopy, Service Canopy) live only under /utes, so
  // their trail reads Home › Ute › <Top> › <Product> — insert the vehicle crumb
  // ahead of the category path. Generic catalog tops go straight under Home.
  const vehicleCrumb = path[0]?.vehicle === 'ute' ? { label: 'Ute', to: '/utes' } : null
  const priceFrom = product.quote?.priceFrom ?? null

  // Same descriptor Card builds — the shape the quote store consumes. `color`
  // rebuilds with each selection so QuoteButton adds the chosen finish.
  const quoteItem = {
    id: product.id,
    name: product.title,
    category: topLabel,
    priceFrom,
    standardDims: product.quote?.standardDims ?? '',
    img: product.img,
    imgAlt: product.imgAlt,
    imageFit: product.imageFit,
    imageTone: product.imageTone,
    imagePosition: product.imagePosition,
    color,
  }

  const hasDetail = product.summary || product.features?.length > 0 || product.specs?.length > 0

  return (
    <main className="product-page">
      <SEO
        title={product.title}
        description={
          product.summary ||
          `${product.title} — Australian-made aluminium, built to order in Dandenong South.`
        }
        image={product.img || undefined}
        path={`/product/${product.slug || product.id}`}
      />

      <nav className="product-page__crumbs container" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {vehicleCrumb && (
          <span className="product-page__crumb">
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <Link to={vehicleCrumb.to}>{vehicleCrumb.label}</Link>
          </span>
        )}
        {path.map((node, i) => (
          <span key={node.id} className="product-page__crumb">
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <Link to={crumbHref(node, i, path)}>{node.label}</Link>
          </span>
        ))}
        <span className="product-page__crumb" aria-current="page">
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
          {product.title}
        </span>
      </nav>

      <section className="product-page__top">
        <div className="container product-page__top-inner">
          <ProductGallery
            img={product.img}
            imgAlt={product.imgAlt}
            images={product.images}
            title={product.title}
            imageFit={product.imageFit}
            imageTone={product.imageTone}
            imagePosition={product.imagePosition}
          />

          <div className="product-page__buy">
            <div className="product-page__buy-card">
              {topLabel && <p className="product-page__eyebrow">{topLabel}</p>}
              <h1 className="product-page__title">{product.title}</h1>
              <span className="product-page__accent" aria-hidden="true" />

              <div className="product-page__price">
                <PriceTag price={product.price ?? priceFrom} discountPct={product.discountPct} />
              </div>

              {product.quote?.standardDims && (
                <>
                  <hr className="product-page__rule" />
                  <div className="product-page__dims">
                    <p className="product-page__dims-label">Standard size</p>
                    <p className="product-page__dims-value">{product.quote.standardDims}</p>
                  </div>
                </>
              )}

              {product.colors?.length > 0 && (
                <ColorSelector colors={product.colors} value={color} onChange={setColor} />
              )}

              <div className="product-page__actions">
                <QuoteButton item={quoteItem} />
              </div>

              <ul className="product-page__trust">
                {TRUST.map(({ Icon, title, sub }) => (
                  <li className="product-page__trust-item" key={title}>
                    <span className="product-page__trust-icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={1.7} />
                    </span>
                    <div>
                      <p className="product-page__trust-title">{title}</p>
                      <p className="product-page__trust-sub">{sub}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="product-page__note">
                <span className="product-page__note-icon" aria-hidden="true">
                  <PhoneCall size={20} strokeWidth={1.8} />
                </span>
                <p>
                  No payment now — add it to your quote and we’ll call back to confirm size and
                  price.
                </p>
              </div>
            </div>

            <p className="product-page__enquire">
              Prefer to talk it through?{' '}
              <Link to="/quote" className="product-page__enquire-link">
                Send an enquiry →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {hasDetail && (
        <section className="section section--alt">
          <div className="container product-page__detail">
            <div className="product-page__copy">
              {product.summary && <p className="product-page__summary">{product.summary}</p>}
              {product.features?.length > 0 && (
                <div className="product-page__included">
                  <h2 className="h2 h2--md">What’s included</h2>
                  <ul className="product-page__list">
                    {product.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {product.specs?.length > 0 && (
              <aside className="product-page__specs-wrap">
                <h2 className="h2 h2--md">Specifications</h2>
                <dl className="product-page__specs">
                  {product.specs.map((s) => (
                    <div key={s.label + s.value} className="product-page__spec">
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </aside>
            )}
          </div>
        </section>
      )}

      <RelatedProducts product={product} />

      <CtaBand />
    </main>
  )
}
