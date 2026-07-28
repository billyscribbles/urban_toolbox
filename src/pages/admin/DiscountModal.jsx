import AdminModal from './AdminModal.jsx'
import StoreDiscount from './StoreDiscount.jsx'

// Store-wide discount dialog — the AdminModal shell plus the discount form.
export default function DiscountModal({ open, onSaved, onClose }) {
  return (
    <AdminModal open={open} title="Store-wide discount" onClose={onClose}>
      <p className="admin-modal__intro">
        One percentage applied to every storefront price at display time. The greater of this and
        each product&rsquo;s own discount wins. Set to 0 to turn it off.
      </p>
      <StoreDiscount onSaved={onSaved} />
    </AdminModal>
  )
}
