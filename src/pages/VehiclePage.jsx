import { useEffect } from 'react'
import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import { getVehicleSections } from '../lib/catalog.js'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'
import { vehicles } from '../content/vehicles.js'

// One page renders /utes, /caravans and /trucks. For utes and caravans,
// sections span every category (Toolboxes + Accessories), each keeping only
// the products flagged for this vehicle in the admin; trucks gets its own two
// fixed, scope-owned sections instead — see catalog.getVehicleSections.
export default function VehiclePage({ vehicle }) {
  const { status } = useProductCatalog()
  useEffect(() => {
    loadProducts()
  }, [])

  const copy = vehicles[vehicle] || vehicles.ute
  const sections = getVehicleSections(vehicle)

  const data = {
    header: {
      eyebrow: copy.eyebrow,
      title: copy.title,
      intro: copy.intro,
      bgImage: copy.heroImage,
    },
    sections,
  }

  return (
    <main>
      <SEO title={copy.title} description={copy.seo} path={copy.path} />
      <ProductRange data={data} status={status} onRetry={retryLoad} />
    </main>
  )
}
