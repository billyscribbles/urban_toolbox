// Raw DB-row shapes (products joined to product_images) — the contract the
// admin writes and productStore.normalizeRow reads. Category ids MUST be real
// leaves from src/data/categories.js.

export const productRows = [
  {
    id: 'ute-under-tray-boxes-1',
    category_id: 'ute-under-tray-boxes',
    title: '580 × 230 × 400mm Aluminium Checker Ute Toolbox',
    slug: '580-x-230-x-400mm-aluminium-checker-ute-toolbox',
    summary: 'Aluminium Checker Plate · 580 × 230 × 400mm',
    specs: [{ label: 'Material', value: 'Aluminium Checker Plate' }],
    features: ['Welding: Full Welded Toolbox'],
    price: null,
    discount_pct: null,
    standard_dims: '580 × 230 × 400mm',
    featured: false,
    sort_order: 0,
    product_images: [
      {
        id: 'img-1',
        product_id: 'ute-under-tray-boxes-1',
        storage_path: 'products/ute-under-tray-boxes-1/shot-a.jpg',
        alt: 'Checker ute toolbox',
        position: 0,
      },
    ],
  },
  {
    id: 'job-site-toolbox-1',
    category_id: 'job-site-toolbox',
    title: 'Job Site Box',
    slug: 'job-site-box',
    summary: 'Heavy duty site box',
    specs: [],
    features: [],
    price: 450,
    discount_pct: 15,
    standard_dims: '1200 × 500 × 700mm',
    featured: true,
    // Caravan-only — exercises the vehicle filter (the other row omits the
    // flags entirely, so it defaults to fits-both).
    fits_ute: false,
    fits_caravan: true,
    // Colours out of canonical order + a junk value — normalizeRow must clean it.
    colors: ['black', 'nope', 'silver'],
    sort_order: 0,
    product_images: [
      {
        id: 'img-3',
        product_id: 'job-site-toolbox-1',
        storage_path: 'products/job-site-toolbox-1/front.jpg',
        alt: 'Site box front',
        position: 1,
      },
      {
        id: 'img-2',
        product_id: 'job-site-toolbox-1',
        storage_path: 'products/job-site-toolbox-1/hero.jpg',
        alt: 'Site box hero',
        position: 0,
      },
    ],
  },
]
