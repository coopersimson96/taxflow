'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { Suspense } from 'react'

function LinkStoreContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [isLinking, setIsLinking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const shop = searchParams.get('shop')
  const organizationId = searchParams.get('org')

  const handleLink = async () => {
    if (!organizationId) {
      setError('Missing organization ID')
      return
    }

    setIsLinking(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/link-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to link store')
      }
    } catch (err) {
      setError('Failed to link store')
    } finally {
      setIsLinking(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to link stores.</p>
          <a 
            href="/auth/signin"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Link Shopify Store</h1>
            <p className="text-gray-600">
              Your Shopify store was successfully connected but needs to be linked to your account.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Store Information</h3>
            <p className="text-blue-700">
              <strong>Store:</strong> {shop || 'Unknown Store'}
            </p>
            <p className="text-blue-700">
              <strong>Current User:</strong> {session?.user?.email}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Why do I need to link this store?</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Your app account email doesn't match your Shopify store owner email</li>
              <li>This is a security feature to prevent unauthorized access</li>
              <li>Once linked, you'll have full access to your store's tax analytics</li>
              <li>You can manage multiple stores from different email accounts</li>
            </ul>
          </div>

          {!result && (
            <div className="text-center mb-6">
              <button
                onClick={handleLink}
                disabled={isLinking || !organizationId}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isLinking || !organizationId
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white transition-colors`}
              >
                {isLinking ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Linking Store...
                  </span>
                ) : (
                  'Link Store to My Account'
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="text-red-900 font-medium mb-2">Error</h4>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-green-900 font-medium mb-4">✅ Store Successfully Linked!</h4>
              
              <div className="space-y-3 mb-6">
                <div>
                  <strong className="text-green-800">Store Name:</strong>
                  <span className="text-green-700 ml-2">{result.storeName}</span>
                </div>
                
                <div>
                  <strong className="text-green-800">Your Role:</strong>
                  <span className="text-green-700 ml-2">{result.userRole}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-green-200">
                <p className="text-green-800 font-medium mb-2">Next Steps:</p>
                <a 
                  href={`/dashboard?organizationId=${result.organizationId}`}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mr-3"
                >
                  View Dashboard
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
                <a 
                  href="/store-selector"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  View All Stores
                </a>
              </div>
            </div>
          )}

          {!organizationId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-yellow-900 font-medium mb-2">Missing Information</h4>
              <p className="text-yellow-700">The organization ID is missing from the URL. Please try connecting your store again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LinkStorePage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <LinkStoreContent />
      </Suspense>
    </AuthGuard>
  )
}