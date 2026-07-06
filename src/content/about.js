export const about = {
  header: {
    eyebrow: 'Who we are',
    title: 'About Urban Toolboxes',
    intro:
      'A Dandenong South workshop building custom aluminium toolboxes, ute accessories and fabrication for tradies, tourers and everyone in between. Australian made, built to work, built to last.',
  },
  photo: {
    label: 'WORKSHOP / TEAM PHOTO',
    img: '/images/caravan-tb-150.jpg',
    imgAlt: 'Aluminium checkerplate toolbox being built in the Urban Toolboxes workshop',
  },
  story: {
    heading: 'Communication is the key',
    paragraphs: [
      "We strive to stay in communication with our clients. Have a question about our business, or want to see if we match your specific needs? Send us a message or give us a call — we're always happy to meet new customers.",
      'From a simple sketch to a finished, road-ready product, everything is designed, drawn and fabricated in-house so you deal with the people actually building your gear.',
    ],
  },
  map: {
    heading: 'Find the workshop',
    address: '23/10 Assembly Drive, Dandenong South VIC 3175, Australia',
    // No-API-key Google Maps embed — auto-geocodes and drops a pin on the address.
    embedSrc:
      'https://maps.google.com/maps?q=23%2F10%20Assembly%20Drive%2C%20Dandenong%20South%20VIC%203175&z=15&output=embed',
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=23%2F10%20Assembly%20Drive%2C%20Dandenong%20South%20VIC%203175',
  },
  contact: [
    {
      icon: 'MapPin',
      title: 'Visit the Workshop',
      lines: ['23/10 Assembly Drive,', 'Dandenong South VIC 3175,', 'Australia'],
    },
    {
      icon: 'Phone',
      title: 'Call Us',
      phones: ['0405 970 059', '0451 065 592'],
    },
    {
      icon: 'Mail',
      title: 'Email',
      email: 'sales@urbantoolboxes.com.au',
      note: "Send us your design and we'll make it come to life.",
    },
  ],
}
