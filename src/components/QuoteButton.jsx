import { Plus, Check } from 'lucide-react'
import { addItem, useQuote } from '../lib/quoteStore.js'

// Opt-in "add to quote" control rendered inside a product Card. Dumb: it only
// knows the descriptor handed to it from content via Card.
export default function QuoteButton({ item }) {
  const { items } = useQuote()
  const inQuote = items.some((i) => i.id === item.id)

  if (inQuote) {
    return (
      <span className="quote-btn quote-btn--added">
        <Check size={16} strokeWidth={2} aria-hidden="true" /> In your quote
      </span>
    )
  }
  return (
    <button type="button" className="quote-btn" onClick={() => addItem(item)}>
      <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add to quote
    </button>
  )
}
