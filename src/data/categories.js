// The category tree — stays in code on purpose. Routes, the mega-menu and
// breadcrumbs are built from this at render time with zero network calls.
// A node without `children` is a LEAF — products (in Supabase) attach to
// leaves only, via products.category_id === leaf id.

export const categories = [
  {
    id: 'toolboxes',
    label: 'Toolboxes',
    slug: 'toolboxes',
    // Every child is a leaf, which would normally flatten the whole top into one
    // anchored page (that's Accessories). `pages: true` opts out: each of the
    // seven families keeps its own /toolboxes/<slug> page, so the mega-menu and
    // sitemap still point at seven indexable category pages rather than seven
    // anchors on a single ~70-product page.
    pages: true,
    children: [
      {
        id: 'camper-trailer-boxes',
        label: 'Camper & Trailer Boxes',
        slug: 'camper-trailer-boxes',
      },
      { id: 'canopies', label: 'Canopies', slug: 'canopies' },
      { id: 'dog-boxes', label: 'Dog Boxes', slug: 'dog-boxes' },
      {
        id: 'side-opening-toolboxes',
        label: 'Side Opening Toolboxes',
        slug: 'side-opening-toolboxes',
      },
      {
        id: 'top-opening-toolboxes',
        label: 'Top Opening Toolboxes',
        slug: 'top-opening-toolboxes',
      },
      { id: 'truck-boxes', label: 'Truck Boxes', slug: 'truck-boxes' },
      {
        id: 'under-tray-toolboxes',
        label: 'Under Tray Toolboxes',
        slug: 'under-tray-toolboxes',
      },
    ],
  },
  {
    id: 'accessories',
    label: 'Accessories',
    slug: 'accessories',
    children: [
      { id: 'mounting-kit', label: 'Mounting Kits', slug: 'mounting-kit' },
      { id: 'locks', label: 'Locks', slug: 'locks' },
      { id: 'drawer-units', label: 'Drawer Units', slug: 'drawer-units' },
      {
        id: 'drawers',
        label: 'Drawers',
        slug: 'drawers',
        children: [
          // Slugs are unique tree-wide (getCategoryBySlug walks every node), so
          // these carry a `drawer-` prefix rather than colliding with the
          // Accessories-level `accessories` / `locks` nodes.
          {
            id: 'drawer-accessories',
            label: 'Accessories',
            slug: 'drawer-accessories',
          },
          { id: 'drawer-locks', label: 'Locks', slug: 'drawer-locks' },
        ],
      },
      { id: 'shelving-units', label: 'Shelving Units', slug: 'shelving-units' },
      { id: 'gas-strut', label: 'Gas Struts', slug: 'gas-strut' },
      { id: 'ladder-rack', label: 'Ladder Racks', slug: 'ladder-rack' },
      { id: 'canopy-ladder', label: 'Canopy Ladders', slug: 'canopy-ladder' },
      { id: 'cargo-cage', label: 'Cargo Cages', slug: 'cargo-cage' },
      {
        id: 'fuel-gas-tool-holder',
        label: 'Fuel, Gas & Tool Holders',
        slug: 'fuel-gas-tool-holder',
      },
      { id: 'jack-off-legs', label: 'Jack-Off Legs', slug: 'jack-off-legs' },
    ],
  },
  // `vehicle: 'ute'` marks a node as vehicle-exclusive: absent from the generic
  // catalog menus and pages, surfaced only on /utes (pinned there even before
  // its first product lands). Top-level leaves, so each stands beside the
  // Browse buttons on the vehicle page rather than inside a group.
  { id: 'trays', label: 'Trays', slug: 'trays', vehicle: 'ute' },
  { id: 'canopy', label: 'Canopy', slug: 'canopy', vehicle: 'ute' },
  { id: 'service-canopy', label: 'Service Canopy', slug: 'service-canopy', vehicle: 'ute' },
  // `exclusive: 'australian-made'` scopes this leaf to its own /australian-made
  // page (same hide-from-generic mechanism as `vehicle`, just a non-vehicle
  // scope). It stays a real leaf, so the admin category dropdown lists it and
  // products can be filed under it — but it never leaks into the Toolboxes /
  // Accessories menus or the Utes / Caravans pages.
  {
    id: 'australian-made',
    label: 'Australian Made',
    slug: 'australian-made',
    exclusive: 'australian-made',
  },
]
