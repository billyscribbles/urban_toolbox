import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import { trucks } from '../content/trucks.js'

export default function TrucksPage() {
  return (
    <main>
      <SEO
        title="Trucks"
        description="Full-height truck toolboxes and tapered under-tray tool boxes for cab-chassis, tippers and fleet trucks — built in Dandenong South."
        path="/trucks"
      />
      <ProductRange data={trucks} />
    </main>
  )
}
