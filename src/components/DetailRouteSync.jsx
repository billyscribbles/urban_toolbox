import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useDetail,
  openDetail,
  closeDetail,
  detailFromProduct,
  detailToken,
} from '../lib/detailStore.js'
import { useProductCatalog } from '../lib/productStore.js'
import { getProductByToken, getTopLabelForProduct } from '../lib/catalog.js'

// Makes ?product=<slug> the single source of truth for the product-detail
// drawer. Cards write the param (so opens are shareable and Back-closable); this
// controller — mounted once, always on — watches it and drives the store:
//   • param present + catalog ready  → open the drawer from the catalog product
//   • param gone                     → close the drawer
// A deep-linked / shared URL therefore opens the same drawer a click would, once
// the catalogue has loaded. An unresolvable token is dropped so the URL can't
// get stuck pointing at nothing.
export default function DetailRouteSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const token = searchParams.get('product')
  const { status } = useProductCatalog()
  const { product, isOpen } = useDetail()

  useEffect(() => {
    if (!token) {
      if (isOpen) closeDetail()
      return
    }
    // Already showing this product — nothing to do.
    if (isOpen && detailToken(product) === token) return
    // Wait for the catalogue before trying to resolve the token.
    if (status !== 'ready') return

    const match = getProductByToken(token)
    if (!match) {
      // Stale or bad slug: clear it rather than leave a dangling ?product.
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('product')
          return next
        },
        { replace: true },
      )
      return
    }
    openDetail(detailFromProduct(match, getTopLabelForProduct(match)))
  }, [token, status, isOpen, product, setSearchParams])

  return null
}
