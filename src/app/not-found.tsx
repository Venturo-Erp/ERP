import Link from 'next/link'
import { ERROR_PAGE_LABELS } from './constants/labels'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-7xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">
          {ERROR_PAGE_LABELS.NOT_FOUND_9250}
        </h2>
        <p className="text-morandi-secondary mb-8">
          {ERROR_PAGE_LABELS.LABEL_9421}
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors"
        >
          {ERROR_PAGE_LABELS.GO_HOME}
        </Link>
      </div>
    </div>
  )
}
