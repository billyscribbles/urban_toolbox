// Focused seed for the Australian Made line — the 10 locally-built caravan /
// camper toolboxes scraped from the old urbantoolboxes.com.au/caravan-toolboxes
// page, filed under the `australian-made` category so they surface on
// /australian-made. Idempotent: re-running upserts rows and replaces photos.
//
// Self-contained (does NOT import scripts/seed-data.mjs) — the source images
// live in public/images/ as caravan-tb-<model>.jpg (+ the -400/-800 WebP
// derivatives), not in the public/images/catalog/ folder the launch catalog
// used.
//
// Usage (creds = the admin user created in the /admin dashboard):
//   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/seed-australian-made.mjs
// or, without a service-role key:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//     SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... \
//     node scripts/seed-australian-made.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMAGES_DIR = join(ROOT, 'public/images')

const CATEGORY_ID = 'australian-made'

// Shared spec/feature set — every unit on the old page carried these verbatim.
const MATERIAL = '2.0mm Checker Plate Aluminium'
const FEATURES = [
  'Locking System: Heavy duty black compression locks',
  'Hinges: Heavy duty black door hinge',
  'Seal: Pinch weld rubber seal',
]

// Model, dimensions and weight straight from the scraped page. Ordered smallest
// to largest. Prices stayed quote-based (site convention) so no price is set.
const MODELS = [
  { model: 'TB-756', dims: '725 × 515 × 620mm', weight: '15kg', img: 'caravan-tb-756' },
  { model: 'TB-147', dims: '1450 × 450 × 610mm', weight: '25kg', img: 'caravan-tb-147' },
  { model: 'TB-150', dims: '1500 × 600 × 900mm', weight: '40kg', img: 'caravan-tb-150' },
  { model: 'TB-165', dims: '1565 × 520 × 680mm', weight: '25kg', img: 'caravan-tb-165' },
  { model: 'TB-177', dims: '1775 × 550 × 645mm', weight: '30kg', img: 'caravan-tb-177' },
  { model: 'TB-185', dims: '1850 × 650 × 600mm', weight: '40kg', img: 'caravan-tb-185' },
  { model: 'TB-199', dims: '1900 × 540 × 950mm', weight: '35kg', img: 'caravan-tb-199' },
  { model: 'TB-277', dims: '2000 × 710 × 700mm', weight: '35kg', img: 'caravan-tb-277' },
  { model: 'TB-295', dims: '2200 × 570 × 1010mm', weight: '70kg', img: 'caravan-tb-295' },
  { model: 'TB-256', dims: '2260 × 565 × 608mm', weight: '40kg', img: 'caravan-tb-256' },
]

const slugDims = (dims) =>
  dims
    .replace(/mm$/, '')
    .replace(/\s*×\s*/g, 'x')
    .replace(/\s+/g, '')

const products = MODELS.map(({ model, dims, weight, img }) => {
  const code = model.toLowerCase()
  return {
    id: `australian-made-${code}`,
    categoryId: CATEGORY_ID,
    title: `${dims} Aluminium Checker Caravan Toolbox (${model})`,
    slug: `${code}-${slugDims(dims)}-aluminium-caravan-toolbox`,
    summary: `${MATERIAL} · ${dims}`,
    specs: [
      { label: 'Model', value: model },
      { label: 'Material', value: MATERIAL },
      { label: 'Dimensions', value: dims },
      { label: 'Weight', value: weight },
    ],
    features: FEATURES,
    standardDims: dims,
    img: `/images/${img}.jpg`,
    imgAlt: `${model} aluminium checker plate caravan toolbox — ${dims}`,
  }
})

const url = process.env.VITE_SUPABASE_URL
// A service-role / secret key bypasses RLS and is the reliable path for a
// server-side seed. Falls back to anon key + admin sign-in when it's absent.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const key = serviceKey || process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (!url || !key || (!serviceKey && (!email || !password))) {
  console.error(
    'Missing env. Need VITE_SUPABASE_URL plus either SUPABASE_SERVICE_ROLE_KEY, or ' +
      'VITE_SUPABASE_ANON_KEY + SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD.',
  )
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
if (serviceKey) {
  console.log('Using service-role key (RLS bypassed).')
} else {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) {
    console.error('Admin sign-in failed:', authError.message)
    process.exit(1)
  }
}

// publicPath like "/images/caravan-tb-165.jpg" -> upload caravan-tb-165.jpg +
// caravan-tb-165-400.webp + caravan-tb-165-800.webp under products/<id>/ and
// return the product_images row.
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

// Seed the products, smallest to largest (array order == sort_order).
for (let sort = 0; sort < products.length; sort++) {
  const p = products[sort]
  const { error } = await supabase.from('products').upsert({
    id: p.id,
    category_id: p.categoryId,
    title: p.title,
    slug: p.slug,
    summary: p.summary ?? '',
    specs: p.specs ?? [],
    features: p.features ?? [],
    price: null,
    discount_pct: null,
    standard_dims: p.standardDims ?? '',
    featured: false,
    sort_order: sort,
  })
  if (error) throw new Error(`${p.id}: ${error.message}`)

  const row = await uploadImage(p.id, p.img, p.imgAlt, 0)
  await supabase.from('product_images').delete().eq('product_id', p.id)
  const { error: imgError } = await supabase.from('product_images').insert([row])
  if (imgError) throw new Error(`${p.id} images: ${imgError.message}`)
  console.log(`✓ ${p.id}`)
}
console.log(`\nSeeded ${products.length} products under "${CATEGORY_ID}".`)
