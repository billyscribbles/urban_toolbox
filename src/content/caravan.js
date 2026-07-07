export const caravan = {
  header: {
    eyebrow: 'Premium range',
    title: 'Caravan Toolboxes',
    intro:
      'Custom aluminium checkerplate toolboxes designed to mount cleanly on your drawbar or A-frame. Weathersealed, lockable and built to handle corrugations from the Vic High Country to the Cape.',
    note: 'Prices exclude GST. Trays are not included in the listed toolbox price.',
  },
  // Every box shares the same build — 2.0mm checkerplate aluminium, heavy-duty
  // black compression locks, black door hinges and a pinch-weld rubber seal
  // (see "Built into every box" below). Cards list the size, weight and price
  // that set each model apart.
  products: [
    {
      title: 'TB-295',
      img: '/images/caravan-tb-295.jpg',
      imgAlt: 'TB-295 large aluminium checkerplate caravan toolbox',
      body: '2200 × 570 × 1010mm · 70kg · $3900 + GST',
      quote: { id: 'tb-295', priceFrom: 3900, standardDims: '2200×570×1010' },
    },
    {
      title: 'TB-150',
      img: '/images/caravan-tb-150.jpg',
      imgAlt: 'TB-150 aluminium checkerplate caravan toolbox',
      body: '1500 × 600 × 900mm · 40kg · $1800 + GST',
      quote: { id: 'tb-150', priceFrom: 1800, standardDims: '1500×600×900' },
    },
    {
      title: 'TB-177',
      img: '/images/caravan-tb-177.jpg',
      imgAlt: 'TB-177 aluminium checkerplate caravan toolbox',
      body: '1775 × 550 × 645mm · 30kg · $1850 + GST',
      quote: { id: 'tb-177', priceFrom: 1850, standardDims: '1775×550×645' },
    },
    {
      title: 'TB-185',
      img: '/images/caravan-tb-185.jpg',
      imgAlt: 'TB-185 aluminium checkerplate caravan toolbox',
      body: '1850 × 650 × 600mm · 40kg · $1800 + GST',
      quote: { id: 'tb-185', priceFrom: 1800, standardDims: '1850×650×600' },
    },
    {
      title: 'TB-165',
      img: '/images/caravan-tb-165.jpg',
      imgAlt: 'TB-165 aluminium checkerplate caravan toolbox',
      body: '1565 × 520 × 680mm · 25kg · $1750 + GST',
      quote: { id: 'tb-165', priceFrom: 1750, standardDims: '1565×520×680' },
    },
    {
      title: 'TB-256',
      img: '/images/caravan-tb-256.jpg',
      imgAlt: 'TB-256 aluminium checkerplate caravan toolbox',
      body: '2260 × 565 × 608mm · 40kg · $1800 + GST',
      quote: { id: 'tb-256', priceFrom: 1800, standardDims: '2260×565×608' },
    },
    {
      title: 'TB-277',
      img: '/images/caravan-tb-277.jpg',
      imgAlt: 'TB-277 aluminium checkerplate caravan toolbox',
      body: '2000 × 710 × 700mm · 35kg · $1900 + GST',
      quote: { id: 'tb-277', priceFrom: 1900, standardDims: '2000×710×700' },
    },
    {
      title: 'TB-199',
      img: '/images/caravan-tb-199.jpg',
      imgAlt: 'TB-199 aluminium checkerplate caravan toolbox',
      body: '1900 × 540 × 950mm · 35kg · $1950 + GST',
      quote: { id: 'tb-199', priceFrom: 1950, standardDims: '1900×540×950' },
    },
    {
      title: 'TB-147',
      img: '/images/caravan-tb-147.jpg',
      imgAlt: 'TB-147 aluminium checkerplate caravan toolbox',
      body: '1450 × 450 × 610mm · 25kg · $1200 + GST',
      quote: { id: 'tb-147', priceFrom: 1200, standardDims: '1450×450×610' },
    },
    {
      title: 'TB-756',
      img: '/images/caravan-tb-756.jpg',
      imgAlt: 'TB-756 compact aluminium checkerplate caravan toolbox',
      body: '725 × 515 × 620mm · 15kg · $850 + GST',
      quote: { id: 'tb-756', priceFrom: 850, standardDims: '725×515×620' },
    },
  ],
  features: {
    heading: 'Built into every box',
    items: [
      {
        title: 'Checkerplate Alloy',
        body: '2.0mm checker plate aluminium that shrugs off dust, water and corrugations.',
      },
      {
        title: 'Dust Sealed',
        body: 'Pinch-weld rubber seals keep the fine stuff on the outside.',
      },
      {
        title: 'Lockable',
        body: 'Heavy-duty black compression locks and matching door hinges on every door.',
      },
      {
        title: 'Made to Fit',
        body: "Every box is built to your van's exact measurements.",
      },
    ],
  },
}
