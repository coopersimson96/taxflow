'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStoreContext } from '@/contexts/StoreContext'
import { ShopifyService } from '@/lib/services/shopify-service'

export default function DisconnectStore() {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentStore, stores, setCurrentStore } = useStoreContext()
  const router = useRouter()

  const handleDisconnect = async () => {
    if (!currentStore) return

    const confirmed = window.confirm(
      `Are you sure you want to disconnect "${currentStore.shopDomain}"? This will remove all data associated with this store and cannot be undone.`
    )

    if (!confirmed) return

    setIsDisconnecting(true)
    setError(null)

    try {
      const response = await fetch(`/api/integrations/${currentStore.id}/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to disconnect store')
      }

      // If this was the only store, redirect to dashboard
      const remainingStores = stores.filter(store => store.id !== currentStore.id)
      
      if (remainingStores.length === 0) {
        router.push('/dashboard')
      } else {
        // Switch to the first remaining store
        setCurrentStore(remainingStores[0])
      }

      // Refresh the page to update the store context
      window.location.reload()

    } catch (error) {
      console.error('Failed to disconnect store:', error)
      setError(error instanceof Error ? error.message : 'Failed to disconnect store')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (!currentStore) {
    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Store Connection</h3>
        <p className="text-sm text-gray-600">No store connected.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Store Connection</h3>
      
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{currentStore.shopDomain}</h4>
            <p className="text-sm text-gray-600">
              Status: <span className="text-green-600 font-medium">Connected</span>
            </p>
            <p className="text-sm text-gray-500">
              Integration ID: {currentStore.id}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Disconnect Store</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Disconnecting your store will permanently remove all transaction data, 
                tax calculations, and reports associated with this store. This action cannot be undone.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDisconnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect Store'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}