import { useEffect } from 'react'
import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import { getVehicleSections } from '../lib/catalog.js'
import { useProductCatalog, loadProducts, retryLoad } from '../lib/productStore.js'

// Copy per vehicle — the only client-facing strings live here so the page body
// stays a thin filter over the shared catalog read layer.
const VEHICLES = {
  ute: {
    title: 'For Utes',
    eyebrow: 'Shop by vehicle',
    intro:
      'Every toolbox, canopy and accessory we build for utes — under-tray boxes, top and side openers, drawers and locks. All Australian-made in aluminium and built to order. Add what fits your setup to a no-obligation quote.',
    seo: 'Aluminium ute toolboxes, canopies and accessories — Australian-made, built to order in Dandenong South. Add to a no-obligation quote.',
    path: '/utes',
    heroImage: '/brand/hero-product-ute.webp',
  },
  caravan: {
    title: 'For Caravans',
    eyebrow: 'Shop by vehicle',
    intro:
      'Toolboxes, storage and accessories suited to caravans and campers — checkerplate boxes, water tanks, drawers and locks. All Australian-made in aluminium and built to order. Add what fits your rig to a no-obligation quote.',
    seo: 'Aluminium caravan toolboxes, storage and accessories — Australian-made, built to order in Dandenong South. Add to a no-obligation quote.',
    path: '/caravans',
    heroImage: '/brand/hero-product-caravan.webp',
  },
  truck: {
    title: 'For Trucks',
    eyebrow: 'Shop by vehicle',
    intro:
      'Aluminium toolboxes and accessories built for trucks — underbody and top-opening boxes, drawers, racks and locks. Australian-made and built to order, measured to your truck. Add what fits to a no-obligation quote.',
    seo: 'Aluminium truck toolboxes and accessories — Australian-made, built to order in Dandenong South. Add to a no-obligation quote.',
    path: '/trucks',
    heroImage: '/brand/hero-truck-1600.webp',
  },
}

// One page renders /utes, /caravans and /trucks. For utes and caravans,
// sections span every category (Toolboxes + Accessories), each keeping only
// the products flagged for this vehicle in the admin; trucks gets its own two
// fixed, scope-owned sections instead — see catalog.getVehicleSections.
export default function VehiclePage({ vehicle }) {
  const { status } = useProductCatalog()
  useEffect(() => {
    loadProducts()
  }, [])

  const copy = VEHICLES[vehicle] || VEHICLES.ute
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
