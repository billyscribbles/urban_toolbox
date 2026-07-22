// The category tree — stays in code on purpose. Routes, the mega-menu and
// breadcrumbs are built from this at render time with zero network calls.
// A node without `children` is a LEAF — products (in Supabase) attach to
// leaves only, via products.category_id === leaf id.

export const categories = [
  {
    id: 'toolboxes',
    label: 'Toolboxes',
    slug: 'toolboxes',
    children: [
      {
        id: 'under-tray-toolboxes',
        label: 'Under Tray Toolboxes',
        slug: 'under-tray-toolboxes',
        children: [
          {
            id: 'ute-under-tray-boxes',
            label: 'Ute Under Tray Boxes',
            slug: 'ute-under-tray-boxes',
          },
          {
            id: 'truck-under-tray-boxes',
            label: 'Truck Under Tray Boxes',
            slug: 'truck-under-tray-boxes',
          },
          { id: 'trundle-trays', label: 'Trundle-Trays', slug: 'trundle-trays' },
          {
            id: 'under-tray-water-tanks',
            label: 'Under Tray Water Tanks',
            slug: 'under-tray-water-tanks',
          },
        ],
      },
      {
        id: 'top-opening-toolboxes',
        label: 'Top Opening Toolboxes',
        slug: 'top-opening-toolboxes',
        children: [
          {
            id: 'rectangle-ute-toolbox',
            label: 'Rectangle Ute Toolbox',
            slug: 'rectangle-ute-toolbox',
          },
          {
            id: 'chest-style-ute-toolbox',
            label: 'Chest Style Ute Toolbox',
            slug: 'chest-style-ute-toolbox',
          },
          {
            id: 'tub-liner-ute-toolbox',
            label: 'Tub Liner Ute Toolbox',
            slug: 'tub-liner-ute-toolbox',
          },
          { id: 'job-site-toolbox', label: 'Job Site Toolbox', slug: 'job-site-toolbox' },
          {
            id: 'cross-deck-gullwing',
            label: 'Cross Deck Gullwing',
            slug: 'cross-deck-gullwing',
          },
        ],
      },
      {
        id: 'side-opening-toolboxes',
        label: 'Side Opening Toolboxes',
        slug: 'side-opening-toolboxes',
        children: [
          { id: 'half-lid-opening', label: 'Half Lid Opening', slug: 'half-lid-opening' },
          {
            id: 'half-lid-with-drawers',
            label: 'Half Lid With Drawers',
            slug: 'half-lid-with-drawers',
          },
          { id: 'full-lid-opening', label: 'Full Lid Opening', slug: 'full-lid-opening' },
          {
            id: 'full-lid-with-internal-drawers',
            label: 'Full Lid With Internal Drawers',
            slug: 'full-lid-with-internal-drawers',
          },
          { id: 'multi-lid-boxes', label: 'Multi-Lid Boxes', slug: 'multi-lid-boxes' },
        ],
      },
      { id: 'camper-ute-toolbox', label: 'Camper Ute Toolbox', slug: 'camper-ute-toolbox' },
      { id: 'tradie-ute-box', label: 'Tradie Ute Box', slug: 'tradie-ute-box' },
      {
        id: 'truck-toolboxes',
        label: 'Truck Toolboxes',
        slug: 'truck-toolboxes',
        children: [
          {
            id: 'under-truck-tool-boxes',
            label: 'Under Truck Tool Boxes',
            slug: 'under-truck-tool-boxes',
          },
          {
            id: 'half-lid-truck-with-drawers',
            label: 'Half Lid Truck With Drawers',
            slug: 'half-lid-truck-with-drawers',
          },
          {
            id: 'full-lid-opening-truck',
            label: 'Full Lid Opening Truck',
            slug: 'full-lid-opening-truck',
          },
          {
            id: 'full-lid-truck-with-drawers',
            label: 'Full Lid Truck With Drawers',
            slug: 'full-lid-truck-with-drawers',
          },
        ],
      },
      {
        id: 'dog-boxes',
        label: 'Dog Boxes',
        slug: 'dog-boxes',
        children: [
          { id: 'full-dog-boxes', label: 'Full Dog Boxes', slug: 'full-dog-boxes' },
          {
            id: 'half-canopy-half-dog-boxes',
            label: 'Half Canopy / Half Dog Boxes',
            slug: 'half-canopy-half-dog-boxes',
          },
        ],
      },
      {
        id: 'camper-trailer-boxes',
        label: 'Camper & Trailer Boxes',
        slug: 'camper-trailer-boxes',
        children: [
          {
            id: 'trailer-boxes-draw-bar-boxes',
            label: 'Trailer Boxes / Draw Bar Boxes',
            slug: 'trailer-boxes-draw-bar-boxes',
          },
          { id: 'caravan-boxes', label: 'Caravan Boxes', slug: 'caravan-boxes' },
          { id: 'generator-boxes', label: 'Generator Boxes', slug: 'generator-boxes' },
        ],
      },
      { id: 'toolbox-canopies', label: 'Toolbox Canopies', slug: 'toolbox-canopies' },
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
      { id: 'rear-gate', label: 'Rear Gates', slug: 'rear-gate' },
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
