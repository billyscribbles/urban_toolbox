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
import { catalog } from '../data/catalog.js'
import { getCategoryBySlug, isLeaf } from '../lib/catalog.js'

describe('content — section copy contract', () => {
  it('hero has a headline, tagline, and two hero photos on disk', () => {
    expect(hero.headline).toBeTruthy()
    expect(hero.headlineLine2).toBeTruthy()
    expect(hero.tagline).toBeTruthy()
    for (const side of ['left', 'right']) {
      const { img } = hero.media[side]
      expect(img).toMatch(/^\/brand\/hero-/)
      expect(existsSync(join(process.cwd(), 'public', img))).toBe(true)
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
})

describe('catalog — category tree contract', () => {
  it('has the two top categories with children', () => {
    const slugs = catalog.categories.map((c) => c.slug)
    expect(slugs).toContain('toolboxes')
    expect(slugs).toContain('accessories')
    for (const top of catalog.categories) {
      expect(top.children.length).toBeGreaterThan(0)
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

describe('catalog — product contract', () => {
  it('every product carries a quote object with an id and dims', () => {
    for (const p of catalog.products) {
      expect(p.quote).toBeTruthy()
      expect(p.quote.id).toMatch(/^[a-z0-9-]+$/)
      expect(typeof p.quote.standardDims).toBe('string')
      expect(p.quote.priceFrom === null || typeof p.quote.priceFrom === 'number').toBe(true)
    }
  })

  it('specs and features are arrays with the right shape', () => {
    for (const p of catalog.products) {
      expect(Array.isArray(p.specs)).toBe(true)
      expect(Array.isArray(p.features)).toBe(true)
      for (const s of p.specs) {
        expect(s.label).toBeTruthy()
        expect(typeof s.value).toBe('string')
      }
      for (const f of p.features) expect(typeof f).toBe('string')
    }
  })

  it('every product categoryId resolves to a real LEAF category', () => {
    for (const p of catalog.products) {
      const node = getCategoryBySlug(p.categoryId)
      expect(node, `categoryId "${p.categoryId}" (product ${p.id})`).toBeTruthy()
      expect(isLeaf(node), `categoryId "${p.categoryId}" must be a leaf`).toBe(true)
    }
  })

  it('product ids and quote ids are globally unique', () => {
    const ids = catalog.products.map((p) => p.id)
    const quoteIds = catalog.products.map((p) => p.quote.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(quoteIds).size).toBe(quoteIds.length)
  })
})
