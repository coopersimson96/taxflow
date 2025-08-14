'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'

interface Store {
  integrationId: string
  organizationId: string
  organizationName: string
  storeName: string
  shopDomain: string
  role: string
  createdAt: string
}

export default function StoreSelectorPage() {
  const { status } = useSession()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStores()
    }
  }, [status])

  const fetchStores = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/debug/list-stores')
      const data = await response.json()
      
      if (data.success) {
        setStores(data.stores)
      } else {
        setError(data.error || 'Failed to load stores')
      }
    } catch (error) {
      setError('Failed to load stores')
      console.error('Error fetching stores:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stores...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Select Store to View</h1>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {stores.map((store) => (
                <div key={store.organizationId} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{store.storeName}</h3>
                      <p className="text-gray-600">{store.shopDomain}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Role: {store.role}</span>
                        <span>Connected: {new Date(store.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="space-x-3">
                      <a
                        href={`/dashboard?organizationId=${store.organizationId}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Dashboard
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                      <a
                        href={`/api/analytics/tax-dashboard?organizationId=${store.organizationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        View API Data
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stores.length === 0 && !error && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No stores found</h3>
                <p className="mt-1 text-sm text-gray-500">Connect your Shopify store to get started.</p>
                <div className="mt-6">
                  <a
                    href="/connect"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Connect Store
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}