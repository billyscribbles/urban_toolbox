import { Link } from 'react-router-dom'

// One destination string, rendered the right way. Internal routes ("/quote",
// "/fabrication#folding") become a client-side <Link>; external targets
// (mailto:, tel:, http(s)) stay a plain <a>. Lets the content/config layer hold
// a bare `to` value without every component re-deciding how to render it.
const isInternal = (to) => typeof to === 'string' && to.startsWith('/')

export default function SmartLink({ to, children, ...rest }) {
  if (isInternal(to)) {
    return (
      <Link to={to} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  )
}
