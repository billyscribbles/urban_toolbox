// One-time seed: pushes the static launch catalog (scripts/seed-data.mjs) into
// Supabase — product rows plus every photo (original JPEG + the committed
// -400/-800 WebP derivatives) into the product-photos bucket. Idempotent:
// re-running upserts rows and replaces photo records.
//
// Usage (values from .env + the admin user created in the dashboard):
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seed-catalog.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from './seed-data.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMAGES_DIR = join(ROOT, 'public/images/catalog')

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (!url || !key || !email || !password) {
  console.error(
    'Missing env. Need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.',
  )
  process.exit(1)
}

const supabase = createClient(url, key)
const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError) {
  console.error('Admin sign-in failed:', authError.message)
  process.exit(1)
}

// publicPath like "/images/catalog/x.jpg" -> upload x.jpg + x-400.webp +
// x-800.webp under products/<id>/ and return the product_images row.
async function uploadImage(productId, publicPath, alt, position) {
  const name = publicPath.split('/').pop()
  const base = name.replace(/\.jpe?g$/i, '')
  const files = [
    { local: name, remote: `products/${productId}/${name}`, type: 'image/jpeg' },
    {
      local: `${base}-400.webp`,
      remote: `products/${productId}/${base}-400.webp`,
      type: 'image/webp',
    },
    {
      local: `${base}-800.webp`,
      remote: `products/${productId}/${base}-800.webp`,
      type: 'image/webp',
    },
  ]
  for (const f of files) {
    const abs = join(IMAGES_DIR, f.local)
    if (!existsSync(abs)) {
      console.warn(`  ! missing ${f.local} — skipped`)
      continue
    }
    const { error } = await supabase.storage
      .from('product-photos')
      .upload(f.remote, readFileSync(abs), { contentType: f.type, upsert: true })
    if (error) throw new Error(`upload ${f.remote}: ${error.message}`)
  }
  return {
    product_id: productId,
    storage_path: `products/${productId}/${name}`,
    alt: alt || '',
    position,
  }
}

const perCategory = new Map()
for (const p of products) {
  const sort = perCategory.get(p.categoryId) ?? 0
  perCategory.set(p.categoryId, sort + 1)

  const { error } = await supabase.from('products').upsert({
    id: p.id,
    category_id: p.categoryId,
    title: p.title,
    slug: p.slug,
    summary: p.summary ?? '',
    specs: p.specs ?? [],
    features: p.features ?? [],
    price: p.quote?.priceFrom ?? null,
    discount_pct: null,
    standard_dims: p.quote?.standardDims ?? '',
    featured: !!p.featured,
    sort_order: sort,
  })
  if (error) throw new Error(`${p.id}: ${error.message}`)

  const shots = p.images?.length ? p.images : [{ src: p.img, alt: p.imgAlt }]
  const rows = []
  for (let i = 0; i < shots.length; i++) {
    rows.push(await uploadImage(p.id, shots[i].src, shots[i].alt ?? p.imgAlt ?? p.title, i))
  }
  await supabase.from('product_images').delete().eq('product_id', p.id)
  const { error: imgError } = await supabase.from('product_images').insert(rows)
  if (imgError) throw new Error(`${p.id} images: ${imgError.message}`)
  console.log(`✓ ${p.id} (${rows.length} photo${rows.length === 1 ? '' : 's'})`)
}
console.log(`\nSeeded ${products.length} products.`)
