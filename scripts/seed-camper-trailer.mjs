// Focused seed for the Camper & Trailer Boxes addition. Idempotent.
//
// Does three things against live Supabase, in one authenticated pass:
//   1. Retires the 3 generator boxes that were mis-filed under
//      `camper-ute-toolbox` (deletes those rows + their storage folder).
//   2. Seeds the 9 target products (generator-boxes / trailer-boxes-draw-bar
//      -boxes / caravan-boxes) from scripts/seed-data.mjs — rows + every photo
//      (JPEG + the -400/-800 WebP derivatives) into the product-photos bucket.
//   3. Leaves everything else untouched.
//
// Usage (creds = the admin user created in the /admin dashboard):
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seed-camper-trailer.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from './seed-data.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IMAGES_DIR = join(ROOT, 'public/images/catalog')

const NEW_CATEGORIES = ['generator-boxes', 'trailer-boxes-draw-bar-boxes', 'caravan-boxes']
const RETIRED_IDS = ['camper-ute-toolbox-1', 'camper-ute-toolbox-2', 'camper-ute-toolbox-3']

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

// 1. Retire the mis-filed generator rows (cascade drops their product_images)
//    and sweep their old storage folder.
for (const id of RETIRED_IDS) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(`delete ${id}: ${error.message}`)
  const { data: leftovers } = await supabase.storage.from('product-photos').list(`products/${id}`)
  if (leftovers?.length) {
    await supabase.storage
      .from('product-photos')
      .remove(leftovers.map((o) => `products/${id}/${o.name}`))
  }
  console.log(`↩ retired ${id}`)
}

// 2. Seed the 9 target products.
const targets = products.filter((p) => NEW_CATEGORIES.includes(p.categoryId))
const perCategory = new Map()
for (const p of targets) {
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
console.log(`\nSeeded ${targets.length} products across ${NEW_CATEGORIES.length} new leaves.`)
