import { useEffect } from 'react'
import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import { australianMade } from '../content/australianMade.js'
import { getProductsForLeaf } from '../lib/catalog.js'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'

// The Australian Made line — the locally-built caravan/camper toolboxes, filed
// under their own `australian-made` category (settable in the admin editor).
// Renders like any category page: hero + a live product grid pulled from
// Supabase, so adding/removing a product there updates this page with no code
// change. One flat section, so the sticky pill nav stays a single anchor.
export default function AustralianMadePage() {
  const { status } = useProductCatalog()
  useEffect(() => {
    loadProducts()
  }, [])

  const products = getProductsForLeaf('australian-made')

  const data = {
    header: {
      eyebrow: australianMade.header.eyebrow,
      title: australianMade.header.title,
      intro: australianMade.header.intro,
    },
    sections: [
      {
        id: 'range',
        label: australianMade.rangeHeading,
        heading: australianMade.rangeHeading,
        products,
      },
    ],
  }

  return (
    <main>
      <SEO
        title="Australian Made"
        description="Australian-made aluminium caravan & camper toolboxes — cut, folded and welded in Dandenong South, Victoria. Built to order; add any size to a no-obligation quote."
        path="/australian-made"
      />
      <ProductRange data={data} status={status} onRetry={retryLoad} />
    </main>
  )
}
