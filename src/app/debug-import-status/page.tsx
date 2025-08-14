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

  const checkCredentials = async (integrationId: string) => {
    try {
      console.log('Checking credentials for integration:', integrationId)
      
      const response = await fetch('/api/admin/check-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId })
      })
      
      const data = await response.json()
      console.log('Credentials check response:', data)
      
      if (response.ok && data.success) {
        let message = `Credentials Analysis for ${data.integration.name}:\n\n`
        
        message += `Integration Status: ${data.integration.status}\n`
        message += `Has Credentials: ${data.analysis.hasCredentials}\n\n`
        
        message += `Possible Shop URLs:\n`
        if (data.possibleShopUrls.length > 0) {
          data.possibleShopUrls.forEach((url: string) => {
            message += `- ${url}\n`
          })
        } else {
          message += '- None found!\n'
        }
        
        message += `\nAccess Token: ${data.analysis.accessToken || data.analysis.access_token || 'Not found'}\n`
        message += `\nRecommendation: ${data.recommendation}`
        
        alert(message)
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Credentials check failed:', data)
        alert(`Credentials check failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Credentials check error:', error)
      alert(`Credentials check failed: ${error}`)
    }
  }

  const debugShopifyApi = async (integrationId: string) => {
    try {
      console.log('Testing Shopify API for integration:', integrationId)
      
      const response = await fetch('/api/admin/debug-shopify-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId })
      })
      
      const data = await response.json()
      console.log('Shopify API debug response:', data)
      
      if (response.ok && data.success) {
        const tests = data.tests
        let message = `Shopify API Debug Results for ${data.integration.shop}:\n\n`
        
        message += `Shop Info: ${tests.shopInfo.test.ok ? '✅ Success' : '❌ Failed'} (${tests.shopInfo.test.status})\n`
        message += `Orders Count: ${tests.ordersCount.test.ok ? '✅ Success' : '❌ Failed'} (${tests.ordersCount.test.status})\n`
        message += `Recent Orders: ${tests.recentOrders.test.ok ? '✅ Success' : '❌ Failed'} (${tests.recentOrders.test.status})\n`
        message += `All Orders Count: ${tests.allOrdersCount.test.ok ? '✅ Success' : '❌ Failed'} (${tests.allOrdersCount.test.status})\n\n`
        
        if (tests.ordersCount.test.ok) {
          message += `Total Orders: ${tests.ordersCount.data?.count || 'N/A'}\n`
        }
        if (tests.allOrdersCount.test.ok) {
          message += `All Orders (any status): ${tests.allOrdersCount.data?.count || 'N/A'}\n`
        }
        if (tests.recentOrders.test.ok) {
          message += `Recent Orders (7 days): ${tests.recentOrders.data?.orders?.length || 0}\n`
        }
        
        alert(message)
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        const debugInfo = data.debugInfo ? `\n\nDebug Info:\n${JSON.stringify(data.debugInfo, null, 2)}` : ''
        console.error('Shopify API debug failed:', data)
        alert(`Shopify API debug failed: ${errorMsg}${debugInfo}`)
      }
    } catch (error) {
      console.error('Shopify API debug error:', error)
      alert(`Shopify API debug failed: ${error}`)
    }
  }

  const forceImport = async (integrationId: string) => {
    try {
      console.log('Force importing for integration:', integrationId)
      
      if (!confirm('Force import will directly fetch and process orders from Shopify. This may take a few minutes. Continue?')) {
        return
      }
      
      const response = await fetch('/api/admin/force-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId, months: 12 })
      })
      
      const data = await response.json()
      console.log('Force import response:', data)
      
      if (response.ok && data.success) {
        alert(`Force import completed! ${data.message}\n\nDetails:\n- Orders fetched: ${data.details.totalOrdersFetched}\n- Orders processed: ${data.details.ordersProcessed}\n- Errors: ${data.details.errors}`)
        fetchStoresAndStatus() // Refresh
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Force import failed:', data)
        alert(`Force import failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Force import error:', error)
      alert(`Force import failed: ${error}`)
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => checkCredentials(store.id)}
                          className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                        >
                          Check Creds
                        </button>
                        <button
                          onClick={() => debugShopifyApi(store.id)}
                          className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                        >
                          Debug API
                        </button>
                        <button
                          onClick={() => triggerImport(store.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Trigger Import
                        </button>
                        <button
                          onClick={() => forceImport(store.id)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                          Force Import
                        </button>
                      </div>
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