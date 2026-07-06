export const fabrication = {
  header: {
    eyebrow: 'Custom metal fabrication',
    title: 'Fabrication',
    intro:
      "Send us your design and we'll make it come to life. High-quality laser cutting, folding and custom fabrication with the precision and turnaround your project needs.",
  },
  services: [
    {
      // anchor also serves the legacy /laser-cutting redirect (see App.jsx).
      anchor: 'laser-cutting',
      icon: 'Crosshair',
      title: 'Laser Cutting',
      body: 'Flawless precision, clean edges and quick turnaround. Custom patterns, logos and intricate designs cut to spec.',
      points: ['Custom designs & logos', 'Fast & accurate', 'Prototyping & production'],
    },
    {
      // anchor also serves the legacy /folding redirect (see App.jsx).
      anchor: 'folding',
      icon: 'Spline',
      title: 'Folding',
      body: 'Accurate bends with sharp, clean lines. From simple bends to complex shapes across various thicknesses.',
      points: ['Aluminium, steel & more', 'Tight-tolerance bends', 'Scalable production'],
    },
    {
      anchor: 'custom-fabrication',
      icon: 'Wrench',
      title: 'Custom Fabrication',
      body: 'Cutting, welding, bending and assembly to create strong, reliable products for any application.',
      points: ['Sheet metal fabrication', 'Structural fabrication', 'Prototype & production runs'],
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
