import { hero } from '../content/hero.js'
import HeroPanel from './HeroPanel.jsx'
import './SplitHero.css'

// Home hero: two full-bleed photo panels side by side (caravan | ute), joined
// by a subtle central seam and a small circular centre control. On tablet and
// phone the panels stack. The heading is the page's H1 lockup, so the section
// carries an aria-label and the visible per-panel headings are H2s.
export default function SplitHero() {
  return (
    <section className="split-hero" aria-label="Caravan and ute toolboxes">
      <h1 className="sr-only">Custom aluminium caravan and ute toolboxes</h1>
      <div className="split-hero__grid">
        {hero.panels.map((panel) => (
          <HeroPanel key={panel.key} panel={panel} />
        ))}
      </div>
      <div className="split-hero__divider" aria-hidden="true">
        <span className="split-hero__knob">{hero.centerLabel}</span>
      </div>
    </section>
  )
}
