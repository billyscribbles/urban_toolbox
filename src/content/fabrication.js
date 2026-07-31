export const fabrication = {
  header: {
    eyebrow: 'Custom fabrication',
    title: 'Fabrication',
    intro:
      "Send us your design and we'll make it come to life. High-quality laser cutting, folding and custom fabrication with the precision and turnaround your project needs.",
  },
  services: [
    {
      // `to` points at the standalone service page; the anchor stays so the
      // in-page jump still works from the sub-nav.
      anchor: 'laser-cutting',
      to: '/laser-cutting',
      icon: 'Crosshair',
      img: '/images/fab-laser-cutting.jpg',
      imgAlt: 'CNC laser cutting head cutting a pattern into a steel sheet, sparks flying',
      title: 'Laser Cutting',
      body: 'Flawless precision, clean edges and quick turnaround. Custom patterns, logos and intricate designs cut to spec.',
      points: ['Custom designs & logos', 'Fast & accurate', 'Prototyping & production'],
    },
    {
      anchor: 'folding',
      to: '/folding',
      icon: 'Spline',
      img: '/images/fab-folding.jpg',
      imgAlt: 'Press brake tooling folding a sheet of steel to a sharp bend',
      title: 'Folding',
      body: 'Accurate bends with sharp, clean lines. From simple bends to complex shapes across various thicknesses.',
      points: ['Clean, sharp bends', 'Any thickness', 'Simple to complex'],
    },
    {
      anchor: 'custom-fabrication',
      icon: 'Wrench',
      img: '/images/fab-welding.jpg',
      imgAlt: 'Welder MIG welding a steel box-section frame in the workshop',
      title: 'Custom Fabrication',
      body: 'Cutting, welding, bending and assembly to create strong, reliable products for any application.',
      points: ['Built to your spec', 'Strong & reliable', 'Cut, weld & assemble'],
    },
  ],
  why: {
    eyebrow: 'Why choose us',
    heading: 'Precision, quality, fast turnaround',
    items: [
      {
        title: 'Precision & Quality',
        body: 'Advanced technology for the highest quality, precise results every time.',
      },
      {
        title: 'Experienced Team',
        body: 'Years of experience across industries for the best possible outcome.',
      },
      {
        title: 'Fast Turnaround',
        body: 'Quick, efficient service without compromising on quality.',
      },
      {
        title: 'Custom Solutions',
        body: 'We work closely with you to build to your exact specifications.',
      },
    ],
  },
}

// Standalone pages for the two fabrication services that carried their own
// rankings on the old GoDaddy site (/laser-cutting and /folding). They stay
// real 200 pages rather than redirects into #anchors on /fabrication: Google
// drops the fragment, so a redirect would have merged two separately-ranking
// URLs — and two distinct commercial queries — into one. Copy carries the old
// pages' keywords forward and goes deeper on materials, tolerances and locality.
export const servicePages = {
  'laser-cutting': {
    seo: {
      title: 'Laser Cutting Services',
      description:
        'Precision laser cutting in Dandenong South, Victoria — custom designs, logos, prototypes and production runs in aluminium, mild steel and stainless. Clean edges, fast turnaround.',
    },
    header: {
      eyebrow: 'Fabrication service',
      title: 'Laser Cutting',
      intro:
        'Precision laser cutting for every project. Whether you are cutting a one-off prototype, a custom logo or a full production run, our machines deliver flawless accuracy, clean edges and quick turnaround — cut in our Dandenong South workshop.',
    },
    img: '/images/fab-laser-cutting.jpg',
    imgAlt: 'CNC laser cutting head cutting a pattern into a steel sheet, sparks flying',
    offer: {
      eyebrow: 'What we offer',
      heading: 'Cut to spec, first time',
      items: [
        {
          title: 'Custom Designs',
          body: 'Bring your ideas to life with precision-cut patterns, logos and intricate designs — straight from your DXF, DWG or STEP file.',
          points: ['DXF / DWG / STEP', 'Logos & signage', 'Intricate profiles'],
        },
        {
          title: 'Fast & Accurate',
          body: 'High-accuracy cutting with tight, repeatable tolerances and clean, square edges that need little to no finishing before folding or welding.',
          points: ['Tight tolerances', 'Clean, square edges', 'Quick turnaround'],
        },
        {
          title: 'Prototyping & Production',
          body: 'One-off prototypes through to bulk production runs. Same file, same nest, same result — so your tenth part matches your first.',
          points: ['One-off prototypes', 'Repeat production runs', 'Consistent results'],
        },
      ],
    },
    materials: {
      eyebrow: 'What we cut',
      heading: 'Aluminium, steel and stainless',
      items: [
        {
          title: 'Aluminium',
          body: 'Sheet and checkerplate — the same material our toolboxes are built from, so we know how it cuts and folds.',
        },
        {
          title: 'Mild Steel',
          body: 'Brackets, plates, frames and structural components cut to your drawing.',
        },
        {
          title: 'Stainless Steel',
          body: 'Corrosion-resistant parts for marine, food-grade and outdoor applications.',
        },
        {
          title: 'Your Design',
          body: 'Send a file or a sketch on the back of an envelope — we will turn it into a cut part.',
        },
      ],
    },
  },

  folding: {
    seo: {
      title: 'Metal Folding Services',
      description:
        'Expert metal folding and press-brake bending in Dandenong South, Victoria. Precise bends with sharp, clean lines in aluminium, steel and stainless — prototypes to high-volume runs.',
    },
    header: {
      eyebrow: 'Fabrication service',
      title: 'Folding',
      intro:
        'Precision metal folding for exceptional quality. Custom parts, prototypes or components for larger assemblies — our press brakes deliver precise bends with minimal tolerance and maximum durability.',
    },
    img: '/images/fab-folding.jpg',
    imgAlt: 'Press brake tooling folding a sheet of steel to a sharp bend',
    offer: {
      eyebrow: 'What we offer',
      heading: 'Sharp, clean, repeatable bends',
      items: [
        {
          title: 'Custom Metal Folding',
          body: 'Tailored folding for a wide range of metals — aluminium, mild steel, stainless and more — bent to your drawing or your sample part.',
          points: ['Aluminium & checkerplate', 'Mild & stainless steel', 'Bent to your drawing'],
        },
        {
          title: 'High Precision',
          body: 'Press brakes that hold accurate bend angles with sharp, clean lines, meeting your exact specifications across the whole run.',
          points: ['Accurate bend angles', 'Sharp, clean lines', 'Built to spec'],
        },
        {
          title: 'Versatility in Design',
          body: 'From a single simple bend to complex multi-hit shapes, across a wide range of thicknesses and lengths.',
          points: ['Simple to complex', 'Range of thicknesses', 'Long-length folds'],
        },
      ],
    },
    materials: {
      eyebrow: 'How we work',
      heading: 'Fast, reliable, scalable',
      items: [
        {
          title: 'Fast Turnaround',
          body: 'Quick turnaround times that meet your deadline without sacrificing quality.',
        },
        {
          title: 'Scalable Production',
          body: 'A single custom piece or a high-volume run — we scale to fit the job.',
        },
        {
          title: 'Cut & Fold Together',
          body: 'Have us laser cut the blank as well and the parts arrive ready to weld — one supplier, one lead time.',
        },
        {
          title: 'Local to Melbourne',
          body: 'Folded in Dandenong South and ready for pickup, or freighted anywhere in Australia.',
        },
      ],
    },
  },
}
