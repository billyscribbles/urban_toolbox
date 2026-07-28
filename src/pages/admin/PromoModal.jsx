import AdminModal from './AdminModal.jsx'
import PromoBannerForm from './PromoBannerForm.jsx'

// Promo banner dialog — the AdminModal shell plus the banner editor.
export default function PromoModal({ open, onSaved, onClose }) {
  return (
    <AdminModal open={open} title="Promo banner" onClose={onClose}>
      <p className="admin-modal__intro">
        A strip above the navigation. With more than one message it crossfades through them, five
        seconds each, on a loop. Visitors can close it — changing any message brings it back for
        everyone who did.
      </p>
      <PromoBannerForm onSaved={onSaved} />
    </AdminModal>
  )
}
