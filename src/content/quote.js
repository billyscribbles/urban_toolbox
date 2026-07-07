// Copy + field definitions for the /quote request form. The QuotePage renders
// straight from this — no strings live in the component.
export const quote = {
  header: {
    eyebrow: 'Get a Quote',
    title: 'Request a Quote',
    intro:
      'Tell us about your caravan toolbox, ute setup or fabrication job and we’ll get back to you — usually the same day — with a free, no-obligation quote.',
  },

  // Each field maps 1:1 to a form control. `name` is what Formspree stores and
  // emails. Order here is render order.
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, autoComplete: 'name' },
    { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, autoComplete: 'tel' },
    {
      name: 'projectType',
      label: 'What can we build for you?',
      type: 'select',
      required: true,
      options: ['Caravan toolbox', 'Ute accessories', 'Metal fabrication', 'Something else'],
    },
    {
      name: 'message',
      label: 'Project details',
      type: 'textarea',
      required: true,
      placeholder:
        'Dimensions, materials, quantity, timeframe — whatever you’ve got. A rough sketch is fine too.',
    },
  ],

  submitLabel: 'Send enquiry',
  submittingLabel: 'Sending…',
  // Subject line on the email Formspree sends to the shop.
  emailSubject: 'New quote request — urbantoolboxes.com.au',

  success: {
    heading: 'Thanks — we’ve got it.',
    body: 'Your enquiry is on its way to the workshop. We’ll be in touch shortly. In a hurry? Call us on the number below.',
  },
  error: {
    heading: 'That didn’t send.',
    body: 'Something went wrong on our end. Please try again, or reach us directly by phone or email below.',
  },

  // Shown above the direct-contact fallback and when the form can't be shown.
  fallbackHeading: 'Prefer to talk?',
}
