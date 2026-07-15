// Single source of truth for design tokens.
// Swap a brand's look by editing this file — applyTheme.js writes these
// onto :root as CSS custom properties (--color-*, --font-*, …) at app boot,
// so every CSS file references them via var(--color-accent) etc.
//
// Urban Toolboxes — clean & bright with an industrial edge: black chrome,
// a single green accent, square (no-radius) surfaces.

export const theme = {
  colors: {
    // Light surfaces & ink
    white: '#ffffff',
    'off-white': '#fafaf8',
    bg: '#ffffff',
    ink: '#171717',
    'ink-strong': '#111111',
    'ink-muted': '#57575a',
    'gray-muted': '#6a6a6c',

    // Dark chrome & sections
    dark: '#0d0d0d',
    'dark-footer': '#0a0a0a',
    'dark-text': '#9a9a96',
    'dark-text-2': '#8a8a86',

    // Borders
    'border-light': '#eceae5',
    'border-dark': '#1e1e1e',
    'border-dark-2': '#262626',
    'border-dark-3': '#333330',

    // The one accent — green, used sparingly.
    accent: '#5c8a2f',
    'accent-hover': '#4d7527',
    'accent-soft': '#e6f0dc',
    // Accent as bare RGB channels, for translucent borders/fills:
    // rgba(var(--color-accent-rgb), 0.5). Keep in sync with `accent` above.
    'accent-rgb': '92, 138, 47',

    // Destructive actions + error text (admin dashboard, form errors).
    danger: '#a03030',
    // Warm sand — used only for the hero eyebrows (editorial reference look).
    sand: '#c4a477',
  },
  fonts: {
    // Display / headings — Manrope ExtraBold (the 'Manrope Display' face is
    // pinned to the 800 weight; see src/fonts.css).
    display: "'Manrope Display', 'Manrope', system-ui, sans-serif",
    // Body / UI / nav — Manrope, real weights.
    body: "'Manrope', system-ui, -apple-system, sans-serif",
    // Mono — placeholder labels, step numbers.
    mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
  },
  // Mostly square, industrial surfaces — the softer md/lg radii are reserved for
  // the premium card surfaces (trust container, category tiles). Logo mark round.
  radii: {
    none: '0',
    sm: '4px',
    md: '12px',
    lg: '18px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(13, 13, 13, 0.06)',
    md: '0 6px 24px rgba(13, 13, 13, 0.10)',
    // Soft, slightly warm-tinted lift for the premium product tiles.
    lg: '0 18px 44px -20px rgba(23, 20, 14, 0.28)',
  },
  transitions: {
    fast: '140ms ease',
    base: '200ms ease',
  },
}
