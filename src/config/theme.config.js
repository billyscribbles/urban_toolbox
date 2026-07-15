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

    // The one accent — green, used sparingly.
    accent: '#5c8a2f',
    'accent-hover': '#4d7527',
    'accent-soft': '#e6f0dc',

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
  // Square, industrial surfaces — only the logo mark is round.
  radii: {
    none: '0',
    sm: '4px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(13, 13, 13, 0.06)',
    md: '0 6px 24px rgba(13, 13, 13, 0.10)',
  },
  transitions: {
    fast: '140ms ease',
    base: '200ms ease',
  },
}
