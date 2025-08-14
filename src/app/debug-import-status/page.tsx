'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'

export default function DebugImportStatusPage() {
  const { data: session, status } = useSession()
  const [stores, setStores] = useState<any[]>([])
  const [importStatuses, setImportStatuses] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStoresAndStatus()
    }
  }, [status])

  const fetchStoresAndStatus = async () => {
    try {
      // Get stores first
      const storesResponse = await fetch('/api/admin/check-all-integrations')
      const storesData = await storesResponse.json()
      
      if (storesData.success) {
        const userStores = storesData.integrations.filter((i: any) => i.isUserMember)
        setStores(userStores)
        
        // Get import status for each store
        const statusPromises = userStores.map(async (store: any) => {
          try {
            const statusResponse = await fetch(`/api/integrations/${store.id}/import-status`)
            const statusData = await statusResponse.json()
            return { storeId: store.id, status: statusData }
          } catch (error) {
            return { storeId: store.id, status: { error: 'Failed to fetch' } }
          }
        })
        
        const statuses = await Promise.all(statusPromises)
        const statusMap = statuses.reduce((acc, item) => {
          acc[item.storeId] = item.status
          return acc
        }, {})
        
        setImportStatuses(statusMap)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const triggerImport = async (integrationId: string) => {
    try {
      console.log('Triggering import for integration:', integrationId)
      const response = await fetch(`/api/integrations/${integrationId}/import-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      console.log('Import response:', data)
      
      if (response.ok && data.success) {
        alert(`Historical import started! ${data.note}`)
        fetchStoresAndStatus() // Refresh
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Import failed:', data)
        alert(`Failed to trigger import: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Import trigger error:', error)
      alert(`Failed to trigger import: ${error}`)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading import status...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Import Status Debug</h1>
            
            <div className="space-y-6">
              {stores.map((store) => {
                const importStatus = importStatuses[store.id]
                
                return (
                  <div key={store.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                        <p className="text-gray-600">{store.shopDomain}</p>
                        <p className="text-sm text-gray-500">Integration ID: {store.id}</p>
                      </div>
                      <button
                        onClick={() => triggerImport(store.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Trigger Import
                      </button>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Import Status:</h4>
                      {importStatus ? (
                        <pre className="text-sm text-gray-700 overflow-auto">
                          {JSON.stringify(importStatus, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-gray-500">Loading status...</p>
                      )}
                    </div>
                    
                    <div className="mt-4 flex space-x-4">
                      <a
                        href={`/dashboard?organizationId=${store.organizationId}`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        View Dashboard
                      </a>
                      <a
                        href={`/api/analytics/tax-dashboard?organizationId=${store.organizationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        View Raw Data
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {stores.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No stores found that you have access to.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}