// Fitment copy, keyed by a category's `vehicle` scope (see data/categories.js).
// "Will it fit my ute?" is the question customers ask before anything else, so
// the answer is surfaced wherever a vehicle-exclusive category is shown — the
// category page hero, the vehicle-page section heads, and the product buy box.
// Adding a new vehicle scope only needs an entry here; no component changes.

export const fitment = {
  ute: {
    // The headline answer. Kept to three words so it reads at a glance.
    label: 'Fits all utes',
    // Stamped-plate spec line — set in the mono face, middot separated.
    spec: 'Every make & model · Single, extra & dual cab',
    note: 'Built to order and measured to your ute — we confirm the fit before we build.',
  },
}
