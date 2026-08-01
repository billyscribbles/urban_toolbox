// Contract: each section's content file keeps the shape its component
// renders. Rewriting copy for a new client is fine; breaking the shape
// (a missing key, an object where an array is expected) fails here.
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { hero } from '../content/hero.js'
import { stats } from '../content/stats.js'
import { services } from '../content/services.js'
import { howItWorks } from '../content/howItWorks.js'
import { testimonials } from '../content/testimonials.js'
import { faq } from '../content/faq.js'
import { legal } from '../content/legal.js'
import { homeCarousel } from '../content/homeCarousel.js'
import { shopByVehicle } from '../content/shopByVehicle.js'
import { fitment } from '../content/fitment.js'
import { categories } from '../data/categories.js'
import { getCategoryBySlug, getCategoryById } from '../lib/catalog.js'
import { VEHICLES } from '../pages/VehiclePage.jsx'

// Products now live in Supabase (their contract is covered by productStore.test.js
// against fixtures/productRows.js); only the static category tree remains here.
const catalog = { categories }

describe('content — section copy contract', () => {
  it('hero has a lockup, two CTAs and a photo on disk', () => {
    expect(hero.eyebrow).toBeTruthy()
    expect(hero.headingLines.length).toBeGreaterThan(0)
    for (const line of hero.headingLines) expect(line).toBeTruthy()
    expect(hero.description).toBeTruthy()
    expect(hero.alt).toBeTruthy()

    expect(hero.ctas).toHaveLength(2)
    for (const cta of hero.ctas) {
      expect(cta.label).toBeTruthy()
      expect(cta.to).toMatch(/^\//)
    }

    // <Img> builds the srcset from this path, so the derivatives must exist too.
    expect(hero.img).toMatch(/^\/brand\/hero-/)
    expect(existsSync(join(process.cwd(), 'public', hero.img))).toBe(true)
    for (const w of [800, 1600]) {
      const webp = hero.img.replace(/\.jpe?g$/, `-${w}.webp`)
      expect(existsSync(join(process.cwd(), 'public', webp))).toBe(true)
    }
  })

  it('stats is a non-empty array of { value, label }', () => {
    expect(stats.length).toBeGreaterThan(0)
    for (const stat of stats) {
      expect(stat.value).toBeTruthy()
      expect(stat.label).toBeTruthy()
    }
  })

  it('services has items with icon, title and body', () => {
    expect(services.items.length).toBeGreaterThan(0)
    for (const item of services.items) {
      expect(item.icon).toBeTruthy()
      expect(item.title).toBeTruthy()
      expect(item.body).toBeTruthy()
    }
  })

  it('howItWorks has numbered, titled steps', () => {
    expect(howItWorks.steps.length).toBeGreaterThan(0)
    for (const step of howItWorks.steps) {
      expect(step.number).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.body).toBeTruthy()
    }
  })

  it('testimonials has quotes with an author', () => {
    expect(testimonials.items.length).toBeGreaterThan(0)
    for (const item of testimonials.items) {
      expect(item.quote).toBeTruthy()
      expect(item.author).toBeTruthy()
    }
  })

  it('faq has question / answer pairs', () => {
    expect(faq.items.length).toBeGreaterThan(0)
    for (const item of faq.items) {
      expect(item.q).toBeTruthy()
      expect(item.a).toBeTruthy()
    }
  })

  it('legal has privacy and terms, each with sections', () => {
    for (const doc of [legal.privacy, legal.terms]) {
      expect(doc.title).toBeTruthy()
      expect(doc.sections.length).toBeGreaterThan(0)
      for (const section of doc.sections) {
        expect(section.heading).toBeTruthy()
        expect(section.body).toBeTruthy()
      }
    }
  })

  it('homeCarousel tiles route to real categories and name a real category id', () => {
    expect(homeCarousel.length).toBeGreaterThanOrEqual(5)
    for (const tile of homeCarousel) {
      expect(tile.label).toBeTruthy()
      // Route must be a real category page: /accessories or /toolboxes/<slug>.
      const slug = tile.to.replace(/^\//, '').split('/').pop()
      expect(getCategoryBySlug(slug), `no category for route ${tile.to}`).toBeTruthy()
      // Photos come from the admin panel (category_images) with a first-product
      // fallback, so there is no image path to check on disk — but the id the
      // resolver keys on must exist in the tree.
      expect(getCategoryById(tile.categoryId), `no category for id ${tile.categoryId}`).toBeTruthy()
    }
  })

  it('shopByVehicle has cards routing to /utes, /caravans and /trucks with images on disk', () => {
    expect(shopByVehicle.eyebrow).toBeTruthy()
    expect(shopByVehicle.heading).toBeTruthy()
    expect(shopByVehicle.cards).toHaveLength(3)
    const routes = shopByVehicle.cards.map((c) => c.to)
    expect(routes).toContain('/utes')
    expect(routes).toContain('/caravans')
    expect(routes).toContain('/trucks')
    for (const card of shopByVehicle.cards) {
      expect(card.label).toBeTruthy()
      expect(card.sub).toBeTruthy()
      expect(card.imgAlt).toBeTruthy()
      expect(existsSync(join(process.cwd(), 'public', card.img)), `missing image ${card.img}`).toBe(
        true,
      )
    }
  })

  it('VehiclePage VEHICLES has real copy and a hero image on disk for every vehicle', () => {
    const vehicles = Object.values(VEHICLES)
    expect(vehicles.length).toBeGreaterThan(0)
    for (const v of vehicles) {
      expect(v.title).toBeTruthy()
      expect(v.intro).toBeTruthy()
      expect(v.seo).toBeTruthy()
      expect(v.path).toMatch(/^\//)
      expect(
        existsSync(join(process.cwd(), 'public', v.heroImage)),
        `missing hero image ${v.heroImage}`,
      ).toBe(true)
    }
  })
})

describe('catalog — category tree contract', () => {
  it('has the two catalog top categories with children', () => {
    const slugs = catalog.categories.map((c) => c.slug)
    expect(slugs).toContain('toolboxes')
    expect(slugs).toContain('accessories')
    // Scope-exclusive tops (vehicle: Trays, Canopy, …; exclusive: Australian
    // Made) are bare leaves by design — only the generic catalog tops must nest.
    for (const top of catalog.categories) {
      if (!top.vehicle && !top.exclusive) expect(top.children.length).toBeGreaterThan(0)
    }
  })

  // "Will it fit my ute?" is the question customers ask first, so every
  // vehicle-scoped category must have fitment copy to answer it. A new scope
  // added to the tree without an entry here would render no badge at all.
  it('every vehicle-scoped category has fitment copy', () => {
    const scopes = new Set()
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.vehicle) scopes.add(n.vehicle)
        if (n.children) walk(n.children)
      }
    }
    walk(catalog.categories)

    expect(scopes.size).toBeGreaterThan(0)
    for (const scope of scopes) {
      expect(fitment[scope], `no fitment copy for vehicle scope "${scope}"`).toBeTruthy()
      expect(fitment[scope].label).toBeTruthy()
      expect(fitment[scope].spec).toBeTruthy()
      expect(fitment[scope].note).toBeTruthy()
    }
  })

  it('every node has an id, label and slug; slugs are globally unique', () => {
    const slugs = []
    const walk = (nodes) => {
      for (const n of nodes) {
        expect(n.id).toMatch(/^[a-z0-9-]+$/)
        expect(n.label).toBeTruthy()
        expect(n.slug).toBeTruthy()
        slugs.push(n.slug)
        if (n.children) walk(n.children)
      }
    }
    walk(catalog.categories)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
