'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'
import DebugModal from '@/components/DebugModal'

export default function DebugImportStatusPage() {
  const { data: session, status } = useSession()
  const [stores, setStores] = useState<any[]>([])
  const [importStatuses, setImportStatuses] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)
  const [debugModal, setDebugModal] = useState<{isOpen: boolean, title: string, content: string}>({
    isOpen: false,
    title: '',
    content: ''
  })

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

  const disconnectStore = async (integrationId: string) => {
    try {
      const storeName = stores.find(s => s.id === integrationId)?.name || 'store'
      
      if (!confirm(`Are you sure you want to disconnect ${storeName}? This will mark it as disconnected and you'll need to reconnect it to import data.`)) {
        return
      }
      
      const reason = prompt('Reason for disconnect (optional):') || 'Manual disconnect via debug interface'
      
      console.log('Disconnecting store:', integrationId)
      
      const response = await fetch('/api/admin/disconnect-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId, reason })
      })
      
      const data = await response.json()
      console.log('Disconnect response:', data)
      
      if (response.ok && data.success) {
        alert(`Successfully disconnected ${data.integration.name}!\n\nYou can now reconnect it using your custom distribution link.`)
        fetchStoresAndStatus() // Refresh the list
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Disconnect failed:', data)
        alert(`Failed to disconnect store: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      alert(`Failed to disconnect store: ${error}`)
    }
  }

  const debugShopifyPayouts = async (integrationId: string) => {
    try {
      const targetDate = prompt('Enter date to check payouts (YYYY-MM-DD) or leave blank for recent:', new Date().toISOString().split('T')[0])
      
      console.log('Debugging Shopify payouts for integration:', integrationId, 'date:', targetDate)
      
      const response = await fetch('/api/admin/debug-shopify-payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId, targetDate })
      })
      
      const data = await response.json()
      console.log('Shopify payouts debug response:', data)
      
      if (response.ok && data.success) {
        const { results, analysis } = data
        let message = `Shopify Payout API Test Results:\n\n`
        
        message += `Has Shopify Payments: ${analysis.hasShopifyPayments ? 'Yes' : 'No'}\n`
        message += `Available Endpoints: ${analysis.availableEndpoints.length}\n\n`
        
        // Show each endpoint result
        for (const [endpoint, result] of Object.entries(results)) {
          const res = result as any
          message += `${endpoint}:\n`
          message += `Status: ${res.status || 'N/A'} ${res.ok ? '✅' : '❌'}\n`
          
          if (res.data) {
            const dataStr = JSON.stringify(res.data, null, 2)
            if (dataStr.length > 500) {
              message += `Data: ${dataStr.substring(0, 500)}...\n`
            } else {
              message += `Data: ${dataStr}\n`
            }
          } else if (res.error) {
            message += `Error: ${res.error}\n`
          }
          message += `\n`
        }
        
        if (analysis.payoutData) {
          message += `\nPayout Data Found:\n`
          message += JSON.stringify(analysis.payoutData.slice(0, 3), null, 2)
        }
        
        message += `\n\nRecommendations:\n`
        analysis.recommendations.forEach((rec: string) => {
          message += `• ${rec}\n`
        })
        
        setDebugModal({
          isOpen: true,
          title: 'Shopify Payout API Test',
          content: message
        })
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Shopify payouts debug failed:', data)
        alert(`Shopify payouts debug failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Shopify payouts debug error:', error)
      alert(`Shopify payouts debug failed: ${error}`)
    }
  }

  const debugShopifyOrders = async (integrationId: string) => {
    try {
      const targetDate = prompt('Enter date to check raw Shopify data (YYYY-MM-DD) or leave blank for Aug 15:', '2025-08-15')
      if (!targetDate) return
      
      console.log('Debugging raw Shopify orders for integration:', integrationId, 'date:', targetDate)
      
      const response = await fetch('/api/admin/debug-shopify-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId, targetDate })
      })
      
      const data = await response.json()
      console.log('Raw Shopify orders debug response:', data)
      
      if (response.ok && data.success) {
        const analysis = data.analysis
        let message = `Raw Shopify Orders for ${targetDate}:\n\n`
        
        message += `Store Timezone: ${analysis.dateRange.timezone}\n`
        message += `Date Range (${analysis.dateRange.timezone}):\n`
        message += `Start: ${new Date(analysis.dateRange.startLocal).toLocaleString()} (local)\n`
        message += `End: ${new Date(analysis.dateRange.endLocal).toLocaleString()} (local)\n`
        message += `UTC Range: ${new Date(analysis.dateRange.start).toISOString()} to ${new Date(analysis.dateRange.end).toISOString()}\n\n`
        
        message += `Total Orders Found: ${analysis.totalOrders}\n\n`
        
        message += `Order Status Breakdown:\n`
        message += `Paid: ${analysis.orderStatusBreakdown.paid}\n`
        message += `Partially Paid: ${analysis.orderStatusBreakdown.partially_paid}\n`
        message += `Authorized: ${analysis.orderStatusBreakdown.authorized}\n`
        message += `Pending: ${analysis.orderStatusBreakdown.pending}\n`
        message += `Refunded: ${analysis.orderStatusBreakdown.refunded}\n`
        message += `Cancelled: ${analysis.orderStatusBreakdown.cancelled}\n\n`
        
        message += `Price Totals by Filter:\n`
        message += `All Orders: $${analysis.priceFieldAnalysis.all_orders.total_price.toFixed(2)}\n`
        message += `Paid Only: $${analysis.priceFieldAnalysis.paid_only.total_price.toFixed(2)}\n`
        message += `Paid + Partially Paid: $${analysis.priceFieldAnalysis.paid_and_partially_paid.total_price.toFixed(2)}\n`
        message += `Excluding Cancelled: $${analysis.priceFieldAnalysis.excluding_cancelled.total_price.toFixed(2)}\n`
        message += `Excluding Refunded: $${analysis.priceFieldAnalysis.excluding_refunded.total_price.toFixed(2)}\n\n`
        
        message += `SHOPIFY LIKELY USES: $${analysis.priceFieldAnalysis.paid_only.current_total_price.toFixed(2)} (paid orders, current_total_price)\n\n`
        
        if (analysis.sampleOrders.length > 0) {
          message += `Sample Orders:\n`
          analysis.sampleOrders.forEach((order: any) => {
            message += `${order.name}: total_price=$${order.total_price}, current_total_price=$${order.current_total_price || 'N/A'}\n`
          })
          message += `\n`
        }
        
        message += `Compare with Shopify's reported $3,548.66:\n`
        analysis.recommendations.forEach((rec: string) => {
          message += `• ${rec}\n`
        })
        
        setDebugModal({
          isOpen: true,
          title: `Raw Shopify Orders - ${targetDate}`,
          content: message
        })
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Raw Shopify orders debug failed:', data)
        alert(`Raw Shopify orders debug failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Raw Shopify orders debug error:', error)
      alert(`Raw Shopify orders debug failed: ${error}`)
    }
  }

  const debugDailyComparison = async (integrationId: string) => {
    try {
      const targetDate = prompt('Enter date to compare (YYYY-MM-DD) or leave blank for today:', '2025-08-15')
      if (!targetDate) return
      
      console.log('Debugging daily comparison for integration:', integrationId, 'date:', targetDate)
      
      const response = await fetch('/api/admin/debug-daily-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId, targetDate })
      })
      
      const data = await response.json()
      console.log('Daily comparison debug response:', data)
      
      if (response.ok && data.success) {
        const analysis = data.analysis
        let message = `Daily Sales Comparison for ${analysis.date}:\n\n`
        
        message += `Date Range (${analysis.dateRange.timezone}):\n`
        message += `Start: ${new Date(analysis.dateRange.start).toLocaleString()}\n`
        message += `End: ${new Date(analysis.dateRange.end).toLocaleString()}\n\n`
        
        message += `Order Count: ${analysis.metrics.totalOrders}\n\n`
        
        message += `Different Sales Calculations:\n`
        analysis.comparison.likelyShopifyMetrics.forEach((metric: any) => {
          message += `${metric.name}: $${metric.value.toFixed(2)}\n`
        })
        message += `\n`
        
        message += `Breakdown:\n`
        message += `Total Tax: $${analysis.metrics.totalTax.toFixed(2)}\n`
        message += `Total Discounts: $${analysis.metrics.totalDiscounts.toFixed(2)}\n`
        message += `Total Shipping: $${analysis.metrics.totalShipping.toFixed(2)}\n\n`
        
        if (Object.keys(analysis.metrics.statusBreakdown).length > 0) {
          message += `Order Status Breakdown:\n`
          Object.entries(analysis.metrics.statusBreakdown).forEach(([status, count]) => {
            message += `${status}: ${count} orders\n`
          })
          message += `\n`
        }
        
        message += `Sample Orders:\n`
        analysis.metrics.sampleTransactions.forEach((tx: any) => {
          message += `#${tx.orderNumber}: $${tx.totalAmount.toFixed(2)} (Status: ${tx.status})\n`
        })
        message += `\n`
        
        message += `Compare these values with Shopify's Aug 15 total of $3,548.66:\n`
        analysis.comparison.recommendations.forEach((rec: string) => {
          message += `• ${rec}\n`
        })
        
        setDebugModal({
          isOpen: true,
          title: `Daily Sales Comparison - ${analysis.date}`,
          content: message
        })
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Daily comparison debug failed:', data)
        alert(`Daily comparison debug failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Daily comparison debug error:', error)
      alert(`Daily comparison debug failed: ${error}`)
    }
  }

  const debugImportStats = async (integrationId: string) => {
    try {
      console.log('Debugging import stats for integration:', integrationId)
      
      const response = await fetch('/api/admin/debug-import-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId })
      })
      
      const data = await response.json()
      console.log('Import stats debug response:', data)
      
      if (response.ok && data.success) {
        const analysis = data.analysis
        let message = `Import Statistics Analysis:\n\n`
        
        message += `Integration: ${analysis.integration.name}\n`
        message += `Status: ${analysis.integration.status}\n`
        message += `Created: ${new Date(analysis.integration.createdAt).toLocaleDateString()}\n\n`
        
        message += `Transaction Statistics:\n`
        message += `Total Count: ${analysis.transactionStats.totalCount}\n`
        message += `Unique Days: ${analysis.transactionStats.uniqueDates}\n`
        message += `Average/Day: ${analysis.transactionStats.averagePerDay.toFixed(1)}\n\n`
        
        if (analysis.transactionStats.dateRange.oldest) {
          message += `Date Range:\n`
          message += `Oldest: ${new Date(analysis.transactionStats.dateRange.oldest).toLocaleDateString()}\n`
          message += `Newest: ${new Date(analysis.transactionStats.dateRange.newest).toLocaleDateString()}\n\n`
        }
        
        message += `Import History:\n`
        message += `Last Sync: ${analysis.importHistory.lastSyncAt ? new Date(analysis.importHistory.lastSyncAt).toLocaleString() : 'Never'}\n`
        message += `Historical Import Completed: ${analysis.importHistory.historicalImportCompleted}\n`
        message += `Import Range: ${analysis.importHistory.historicalImportRange || 'Not set'}\n`
        message += `Last Import Count: ${analysis.importHistory.lastImportOrderCount || 'Unknown'}\n\n`
        
        if (analysis.dateBreakdown.length > 0) {
          message += `Recent Daily Breakdown:\n`
          analysis.dateBreakdown.slice(-7).forEach((day: any) => {
            message += `${day.date}: ${day.count} orders, $${day.totalSales.toFixed(2)} sales\n`
          })
          message += `\n`
        }
        
        if (analysis.recommendations.length > 0) {
          message += `Recommendations:\n`
          analysis.recommendations.forEach((rec: string) => {
            message += `• ${rec}\n`
          })
        }
        
        setDebugModal({
          isOpen: true,
          title: 'Import Statistics Analysis',
          content: message
        })
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Import stats debug failed:', data)
        alert(`Import stats debug failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Import stats debug error:', error)
      alert(`Import stats debug failed: ${error}`)
    }
  }

  const debugReportingWindows = async (integrationId: string) => {
    try {
      console.log('Debugging reporting windows for integration:', integrationId)
      
      const response = await fetch('/api/admin/debug-reporting-windows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId })
      })
      
      const data = await response.json()
      console.log('Reporting windows debug response:', data)
      
      if (response.ok && data.success) {
        const analysis = data.analysis
        let message = `Reporting Windows Analysis:\n\n`
        
        message += `Server Time: ${new Date(analysis.serverTime).toLocaleString()}\n`
        message += `Server Timezone: ${analysis.serverTimezone}\n\n`
        
        message += `Today's Range:\n`
        message += `Start: ${new Date(analysis.todayRange.start).toLocaleString()}\n`
        message += `End: ${new Date(analysis.todayRange.end).toLocaleString()}\n\n`
        
        message += `Transactions:\n`
        message += `Total in DB: ${analysis.totalTransactions}\n`
        message += `Today: ${analysis.todayTransactionCount}\n`
        message += `Last 7 days: ${analysis.last7DaysTransactionCount}\n\n`
        
        message += `Today's Totals (Our Calculation):\n`
        message += `Sales: $${analysis.todayCalculations.totalSales}\n`
        message += `Tax: $${analysis.todayCalculations.taxAmount}\n`
        message += `Payout: $${analysis.todayCalculations.payoutAmount}\n\n`
        
        if (analysis.dateRange.oldest) {
          message += `Data Range: ${new Date(analysis.dateRange.oldest).toLocaleDateString()} to ${new Date(analysis.dateRange.newest).toLocaleDateString()}\n\n`
        }
        
        message += `Compare these numbers with your Shopify dashboard!`
        
        setDebugModal({
          isOpen: true,
          title: 'Reporting Windows Analysis',
          content: message
        })
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Reporting debug failed:', data)
        alert(`Reporting debug failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Reporting debug error:', error)
      alert(`Reporting debug failed: ${error}`)
    }
  }

  const validateToken = async (integrationId: string) => {
    try {
      console.log('Validating token for integration:', integrationId)
      
      const response = await fetch('/api/admin/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId })
      })
      
      const data = await response.json()
      console.log('Token validation response:', data)
      
      if (response.ok && data.success) {
        let message = `Token Validation for ${data.integration.name}:\n\n`
        
        message += `Shop: ${data.integration.shop}\n`
        message += `Token Format: ${data.token.format}\n`
        message += `Token Length: ${data.token.length}\n\n`
        
        message += `API Test Result:\n`
        message += `Status: ${data.apiTest.status} (${data.apiTest.ok ? 'Success' : 'Failed'})\n`
        message += `URL: ${data.apiTest.url}\n\n`
        
        message += `Analysis:\n`
        message += `Token Valid: ${data.analysis.tokenValid}\n`
        if (data.analysis.shopifyError) {
          message += `Shopify Error: ${JSON.stringify(data.analysis.shopifyError)}\n`
        }
        message += `Recommendation: ${data.analysis.recommendation}\n`
        
        alert(message)
      } else {
        const errorMsg = data.error || data.details || 'Unknown error'
        console.error('Token validation failed:', data)
        alert(`Token validation failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Token validation error:', error)
      alert(`Token validation failed: ${error}`)
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
      
      const monthsStr = prompt('How many months of history to import? (default: 24)', '24')
      const maxOrdersStr = prompt('Maximum number of orders to import? (default: 5000)', '5000')
      
      if (!monthsStr || !maxOrdersStr) {
        return
      }
      
      const months = parseInt(monthsStr) || 24
      const maxOrders = parseInt(maxOrdersStr) || 5000
      
      if (!confirm(`Force import will fetch up to ${maxOrders} orders from the last ${months} months. This may take several minutes. Continue?`)) {
        return
      }
      
      const response = await fetch('/api/admin/force-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId, months, maxOrders })
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
                          onClick={() => validateToken(store.id)}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                        >
                          Validate Token
                        </button>
                        <button
                          onClick={() => debugReportingWindows(store.id)}
                          className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
                        >
                          Debug Dates
                        </button>
                        <button
                          onClick={() => debugImportStats(store.id)}
                          className="px-3 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700"
                        >
                          Debug Import
                        </button>
                        <button
                          onClick={() => debugDailyComparison(store.id)}
                          className="px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                        >
                          Compare Day
                        </button>
                        <button
                          onClick={() => debugShopifyOrders(store.id)}
                          className="px-3 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700"
                        >
                          Raw Shopify
                        </button>
                        <button
                          onClick={() => debugShopifyPayouts(store.id)}
                          className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                        >
                          Test Payouts
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
                        <button
                          onClick={() => disconnectStore(store.id)}
                          className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                        >
                          Disconnect
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
      
      <DebugModal
        isOpen={debugModal.isOpen}
        onClose={() => setDebugModal({isOpen: false, title: '', content: ''})}
        title={debugModal.title}
        content={debugModal.content}
      />
    </AuthGuard>
  )
}