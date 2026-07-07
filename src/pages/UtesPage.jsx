import SEO from '../lib/seo.jsx'
import ProductRange from '../components/ProductRange.jsx'
import { utes } from '../content/utes.js'

export default function UtesPage() {
  return (
    <main>
      <SEO
        title="Utes"
        description="Ute trays, toolboxes, canopies, service bodies and accessories — aluminium and fabricated to fit your ute in Dandenong South."
        path="/utes"
      />
      <ProductRange data={utes} />
    </main>
  )
}
