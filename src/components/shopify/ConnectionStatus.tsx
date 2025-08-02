'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Integration {
  id: string
  type: string
  name: string
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING'
  lastSyncAt?: string
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'
  syncError?: string
  credentials?: {
    shop: string
    scope: string
    shopInfo?: {
      name: string
      domain: string
      email: string
      timezone: string
      currency: string
    }
  }
}

interface ConnectionStatusProps {
  organizationId?: string
  onConnect?: () => void
  className?: string
}

export function ConnectionStatus({ organizationId, onConnect, className = '' }: ConnectionStatusProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchIntegrations()
  }, [organizationId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/integrations${organizationId ? `?organizationId=${organizationId}` : ''}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch integrations')
      }

      const data = await response.json()
      setIntegrations(data.integrations || [])
    } catch (err) {
      console.error('Error fetching integrations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this store? This will stop automatic tax tracking.')) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect integration')
      }

      await fetchIntegrations() // Refresh the list
    } catch (err) {
      console.error('Error disconnecting integration:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'CONNECTED':
        return 'text-green-600 bg-green-100'
      case 'DISCONNECTED':
        return 'text-gray-600 bg-gray-100'
      case 'ERROR':
        return 'text-red-600 bg-red-100'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSyncStatusColor = (syncStatus: Integration['syncStatus']) => {
    switch (syncStatus) {
      case 'SUCCESS':
        return 'text-green-600'
      case 'ERROR':
        return 'text-red-600'
      case 'SYNCING':
        return 'text-blue-600'
      case 'IDLE':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatLastSync = (lastSyncAt?: string) => {
    if (!lastSyncAt) return 'Never'
    
    const date = new Date(lastSyncAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  const shopifyIntegrations = integrations.filter(integration => integration.type === 'SHOPIFY')

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900">
          Shopify Connections
        </h3>
        {shopifyIntegrations.length === 0 && (
          <Button 
            onClick={() => {
              console.log('Connect Store button clicked')
              onConnect?.()
            }} 
            size="sm"
          >
            Connect Store
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {shopifyIntegrations.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-secondary-900 mb-2">
            No Shopify Store Connected
          </h4>
          <p className="text-secondary-600 mb-4">
            Connect your Shopify store to start tracking tax collected from sales automatically.
          </p>
          <Button 
            onClick={() => {
              console.log('Connect Your First Store button clicked')
              onConnect?.()
            }}
          >
            Connect Your First Store
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {shopifyIntegrations.map((integration) => (
            <div key={integration.id} className="border border-secondary-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-medium text-secondary-900 mr-3">
                      {integration.name}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}>
                      {integration.status}
                    </span>
                  </div>
                  
                  {integration.credentials?.shop && (
                    <p className="text-sm text-secondary-600 mb-2">
                      {integration.credentials.shop}.myshopify.com
                    </p>
                  )}

                  <div className="flex items-center text-sm text-secondary-500">
                    <span className="mr-4">
                      Last sync: {formatLastSync(integration.lastSyncAt)}
                    </span>
                    <span className={`font-medium ${getSyncStatusColor(integration.syncStatus)}`}>
                      {integration.syncStatus === 'SYNCING' && (
                        <svg className="inline w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {integration.syncStatus}
                    </span>
                  </div>

                  {integration.syncError && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {integration.syncError}
                    </p>
                  )}

                  {integration.credentials?.shopInfo && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium">Email:</span> {integration.credentials.shopInfo.email}
                        </div>
                        <div>
                          <span className="font-medium">Currency:</span> {integration.credentials.shopInfo.currency}
                        </div>
                        <div>
                          <span className="font-medium">Timezone:</span> {integration.credentials.shopInfo.timezone}
                        </div>
                        <div>
                          <span className="font-medium">Scope:</span> {integration.credentials.scope}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col space-y-2">
                  <Button
                    onClick={() => fetchIntegrations()}
                    size="sm"
                    variant="outline"
                    disabled={integration.syncStatus === 'SYNCING'}
                  >
                    {integration.syncStatus === 'SYNCING' ? 'Syncing...' : 'Refresh'}
                  </Button>
                  <Button
                    onClick={() => handleDisconnect(integration.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-secondary-200">
            <Button
              onClick={onConnect}
              variant="outline"
              size="sm"
              className="w-full"
            >
              + Connect Another Store
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}