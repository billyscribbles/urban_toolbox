// One-off cleanup: delete storage files under the product-photos bucket that no
// product_images row references.
//
// These accumulated because the bucket's SELECT policy was missing, which made
// every storage delete a silent no-op (see 0007_restore_storage_read_policy.sql).
// With that policy restored, deletes work again — this clears the backlog.
//
//   yarn node scripts/sweep-orphan-photos.mjs           # dry run, lists what it would delete
//   yarn node scripts/sweep-orphan-photos.mjs --apply   # actually deletes
//
// `yarn node`, not bare `node` — this repo uses Yarn PnP, so there is no
// node_modules for Node's own resolver to find @supabase/supabase-js in.
//
// Credentials come from .env (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY);
// the service role key is needed because this reads and deletes across every
// product's photos regardless of RLS.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BUCKET = 'product-photos'
const apply = process.argv.includes('--apply')

// Vite loads .env for the app, but a plain Node script gets nothing — read it
// here so this runs as one command instead of an env-var prefix soup.
const envPath = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error(
    'Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env or the environment).',
  )
  process.exit(1)
}
const supabase = createClient(url, serviceKey)

// A file's "base" is its path without the extension or derivative suffix, so a
// master and its two WebP derivatives collapse to one key. Matching on the base
// (rather than deriving a .jpg master) is what keeps PNG-mastered products safe:
// their -400/-800 derivatives share the PNG's base, not a .jpg one.
const baseOf = (name) =>
  /-(400|800)\.webp$/.test(name)
    ? name.replace(/-(400|800)\.webp$/, '')
    : name.replace(/\.(jpe?g|png)$/, '')

async function listAll(prefix = 'products', acc = []) {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) throw new Error(`${prefix}: ${error.message}`)
  for (const entry of data) {
    // Storage returns folders as rows with a null id.
    if (entry.id === null) await listAll(`${prefix}/${entry.name}`, acc)
    else acc.push(`${prefix}/${entry.name}`)
  }
  return acc
}

const { data: rows, error } = await supabase.from('product_images').select('storage_path')
if (error) throw new Error(error.message)
const referenced = new Set(rows.map((r) => baseOf(r.storage_path)))

const files = await listAll()
const orphans = files.filter((f) => !referenced.has(baseOf(f)))

console.log(`${files.length} files, ${rows.length} referenced rows`)
console.log(`${orphans.length} orphaned files across ${new Set(orphans.map(baseOf)).size} groups`)
for (const o of orphans) console.log(`  ${o}`)

if (!apply) {
  console.log('\nDry run. Re-run with --apply to delete.')
  process.exit(0)
}

// Chunked so one oversized request body can't fail the whole sweep.
let removed = 0
for (let i = 0; i < orphans.length; i += 50) {
  const batch = orphans.slice(i, i + 50)
  const { data, error: rmError } = await supabase.storage.from(BUCKET).remove(batch)
  if (rmError) throw new Error(rmError.message)
  removed += data.length
}
console.log(`\nDeleted ${removed} files.`)
