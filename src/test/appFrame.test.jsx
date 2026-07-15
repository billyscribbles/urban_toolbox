import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'

// AdminPage (lazy) pulls the real adminApi on mount; stub it so /admin renders
// its login without touching Supabase.
vi.mock('../lib/adminApi.js', () => ({
  watchSession: async (cb) => {
    cb(null)
    return () => {}
  },
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAdminProducts: vi.fn(async () => []),
  saveProduct: vi.fn(),
  deleteProduct: vi.fn(),
  uploadPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  swapPhotoPositions: vi.fn(),
  fetchProductImages: vi.fn(async () => []),
}))
vi.mock('../lib/analytics.js', () => ({ trackPageview: vi.fn(), initAnalytics: vi.fn() }))

const { default: App } = await import('../App.jsx')

function renderAt(path) {
  window.history.pushState({}, '', path)
  return render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  )
}

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App storefront chrome', () => {
  it('renders the marketing nav on the home route', async () => {
    renderAt('/')
    expect(await screen.findByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('hides the marketing nav on /admin and shows the admin login', async () => {
    renderAt('/admin')
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull()
  })
})
