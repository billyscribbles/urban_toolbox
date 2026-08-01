import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, ShieldCheck, Package, PhoneCall, FileDown } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import ProductGallery from '../components/ProductGallery.jsx'
import RelatedProducts from '../components/RelatedProducts.jsx'
import PriceTag from '../components/PriceTag.jsx'
import QuoteButton from '../components/QuoteButton.jsx'
import ColorSelector from '../components/ColorSelector.jsx'
import StockBadge from '../components/StockBadge.jsx'
import CtaBand from '../components/CtaBand.jsx'
import FitmentBadge from '../components/FitmentBadge.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import {
  getProductByToken,
  getCategoryById,
  getCategoryPath,
  getTopLabelForProduct,
} from '../lib/catalog.js'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'
import { productSchema, breadcrumbSchema } from '../lib/schema.js'
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

// Australia silhouette — lucide has no country shapes, so this keeps the
// "Australian made" trust cell literal. Traced from real coastal reference
// points (Cape York, the Gulf of Carpentaria, Arnhem Land, the Kimberley,
// Steep Point, the Great Australian Bight, Wilsons Promontory, Byron Bay)
// projected into the 24x24 box, so the landmass reads correctly at the 22px
// the trust row renders it at. Filled rather than stroked — a country outline
// smears into mush at this size.
function AustraliaIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.5 3 16.1 4.4 15.7 6.6 15 6.9 13.8 6 13.6 4.4 13.7 3.8 12.5 3.7 11.4 3.3 10.8 4 10.1 5.3 9.4 5.6 8.8 4.7 7.2 6.1 6.5 7.1 4.9 8.1 2.5 9.1 2 11.4 2.9 13.6 3.2 14.7 2.9 16 4.3 16.4 6.3 15.7 9.8 14.5 10.9 14.4 12.2 14.7 13.2 16.2 14.5 16.6 15.6 18 17 18.4 18.4 18.5 20.2 17.7 20.9 15.7 21.8 13.7 22 12.8 21.8 11 20.9 10.2 19.8 8.7 18.4 7.5 18.1 6.4 17.5 4.9 Z" />
      <path d="M17.5 19.9 19.4 19.9 19.3 20.8 18.7 21.5 18.1 21.2 17.6 20.7 Z" />
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
  // The same scope drives the fitment chip in the buy box.
  const vehicleScope = path[0]?.vehicle ?? null
  const vehicleCrumb = vehicleScope === 'ute' ? { label: 'Ute', to: '/utes' } : null
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

  const productPath = `/product/${product.slug || product.id}`
  // Structured data mirrors the visible breadcrumb below, so the two can't drift.
  const crumbs = [
    ...(vehicleCrumb ? [vehicleCrumb] : []),
    ...path.map((node, i) => ({ label: node.label, to: crumbHref(node, i, path) })),
  ]

  return (
    <main className="product-page">
      <SEO
        title={product.title}
        description={
          product.summary ||
          `${product.title} — Australian-made aluminium, built to order in Dandenong South.`
        }
        image={product.img || undefined}
        path={productPath}
        schema={[
          productSchema(product, { path: productPath, categoryLabel: topLabel }),
          breadcrumbSchema(crumbs, product.title),
        ]}
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

              {/* Fitment sits above the price: it's the qualifying question, so
                  it should be answered before the number. */}
              {vehicleScope && <FitmentBadge vehicle={vehicleScope} variant="inline" />}

              <div className="product-page__price">
                <PriceTag price={product.price ?? priceFrom} discountPct={product.discountPct} />
              </div>

              {/* Availability sits under the price: it qualifies the number
                  above it rather than the decision to enquire below. */}
              <StockBadge inStock={product.inStock} />

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
                {/* A plain anchor, not a button with a handler: keyboard,
                    right-click → Save link as, and middle-click all work for
                    free. The Content-Disposition header from ?download= does
                    the real work; the download attribute is belt-and-braces. */}
                {product.brochureUrl && (
                  <a className="product-page__brochure" href={product.brochureUrl} download>
                    <FileDown size={18} strokeWidth={1.8} aria-hidden="true" />
                    Download brochure (PDF)
                  </a>
                )}
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
