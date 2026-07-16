// Home "story" block — a workshop photo beside an about-us intro, three proof
// stats and a link through to the About page. `icon` names a lucide-react icon
// resolved in StoryBlock.jsx.
export const story = {
  eyebrow: 'About Urban Toolboxes',
  heading: 'Australian made. Proudly local.',
  body: 'Based in Dandenong South, we design and fabricate premium aluminium toolboxes and storage solutions for caravans, utes and work vehicles across Australia.',
  media: {
    img: '/images/story-workshop.jpg',
    imgAlt:
      'Aluminium checkerplate toolbox being built on the bench in the Urban Toolboxes workshop',
  },
  stats: [
    { icon: 'MapPin', value: 'Australian Made & Owned', label: 'Dandenong South, VIC' },
    { icon: 'Award', value: '10+ Years', label: 'Fabrication experience' },
    { icon: 'Users', value: '1000+', label: 'Happy customers' },
  ],
  cta: { label: 'Our story', to: '/about' },
}
