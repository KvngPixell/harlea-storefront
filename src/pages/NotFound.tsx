import { EmptyState } from '../components/ui'
import { Link } from '../lib/router'

export default function NotFound() {
  return (
    <div className="px-4 py-16">
      <EmptyState title="We couldn’t find that page">
        <p>It may have sold out or moved.</p>
        <Link to="/" className="btn btn-primary mt-5">Back to the shop</Link>
      </EmptyState>
    </div>
  )
}
