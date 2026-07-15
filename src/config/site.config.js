// Single source of truth for brand identity, nav, SEO, integrations.
// Every new site starts by editing this file.

export const site = {
  brand: {
    name: 'Urban Toolboxes',
    logoText: 'URBAN TOOLBOXES',
    tagline:
      'Custom aluminium caravan toolboxes, ute accessories and metal fabrication — designed and built in Dandenong South.',
    // Circular building-bars logo mark shown beside the wordmark in the Navbar/Footer.
    logoMark: '/brand/logo-mark.png',
    // Short line rendered under the wordmark (mirrors the badge lockup).
    logoSub: 'BUILT TO WORK. BUILT TO LAST.',
    // Optional single-image logo — leave null to use the mark + wordmark lockup.
    logoSrc: null,
  },

  // Home is intentionally omitted — the logo links back to it, so the bar stays
  // uncluttered. Footer keeps an explicit Home link for completeness.
  nav: [
    { label: 'Caravan Toolboxes', to: '/caravan-toolboxes' },
    { label: 'Utes', to: '/utes' },
    { label: 'Trucks', to: '/trucks' },
    { label: 'Fabrication', to: '/fabrication' },
    { label: 'About', to: '/about' },
  ],

  // Primary conversion action — the quote request form.
  cta: {
    label: 'Get a Quote',
    href: '/quote',
  },

  footer: {
    columns: [
      {
        title: 'Products',
        links: [
          { label: 'Caravan Toolboxes', to: '/caravan-toolboxes' },
          { label: 'Utes', to: '/utes' },
          { label: 'Trucks', to: '/trucks' },
          { label: 'Fabrication', to: '/fabrication' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'Home', to: '/' },
          { label: 'About & Contact', to: '/about' },
          { label: 'Get a Quote', to: '/quote' },
        ],
      },
    ],
    copyright: `© ${new Date().getFullYear()} Urban Toolboxes. A division of Urban Trading & Construction Pty Ltd.`,
    // Right-hand line in the footer's bottom bar.
    madeLine: 'Australian Made · Dandenong South, VIC',
    // Agency credit — always shown in the footer.
    credit: { label: 'Site by Onrai', href: 'https://www.onraistudio.com/' },
  },

  social: {
    instagram: 'https://www.instagram.com/urbantoolboxes',
    facebook: 'https://www.facebook.com/urbantoolboxes',
    linkedin: '',
  },

  contact: {
    email: 'sales@urbantoolboxes.com.au',
    phone: '0405 970 059',
    location: '23/10 Assembly Drive, Dandenong South VIC 3175',
    hours: 'Mon–Fri 8:00am – 4:30pm',
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=23%2F10+Assembly+Drive+Dandenong+South+VIC+3175',
    // Structured address + map pin — mirrors the LocalBusiness schema the old
    // GoDaddy site emitted, so local rankings and the Google map pin carry over.
    address: {
      street: '23/10 Assembly Drive',
      locality: 'Dandenong South',
      region: 'VIC',
      postalCode: '3175',
      country: 'AU',
    },
    geo: { lat: -38.0075151, lng: 145.2463482 },
  },

  seo: {
    defaultTitle: 'Urban Toolboxes — Custom Aluminium Caravan & Ute Toolboxes',
    titleTemplate: '%s · Urban Toolboxes',
    description:
      'Australian-made custom aluminium caravan toolboxes, ute accessories and metal fabrication — designed and built in Dandenong South, Victoria.',
    siteUrl: import.meta.env.VITE_SITE_URL || 'https://urbantoolboxes.com.au',
    // 1200x630 branded card — social platforms ignore SVG.
    ogImage: '/brand/og-image.jpg',
    locale: 'en_AU',
  },

  integrations: {
    formspreeId: import.meta.env.VITE_FORMSPREE_ID || '',
    // GA4 + GTM carried over 1:1 from the old GoDaddy site so historical
    // analytics stay continuous and any Google Ads conversion / remarketing
    // tags living inside the GTM container keep firing after the migration.
    // Env overrides win; the baked-in defaults guarantee tracking still ships
    // even if the Railway env vars are ever missing.
    gaId: import.meta.env.VITE_GA_ID || 'G-SSNHCGBC00',
    gtmId: import.meta.env.VITE_GTM_ID || 'GTM-5LSFWFMN',
  },
}
