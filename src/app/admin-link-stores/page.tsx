'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'

interface Integration {
  id: string
  name: string
  status: string
  organizationId: string
  organizationName: string
  shopDomain: string
  shopOwnerEmail?: string
  customerEmail?: string
  createdAt: string
  members: Array<{
    userId: string
    email: string
    name?: string
    role: string
  }>
  isUserMember: boolean
  isPending: boolean
}

export default function AdminLinkStoresPage() {
  const { data: session, status } = useSession()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkingStore, setLinkingStore] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchIntegrations()
    }
  }, [status])

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/check-all-integrations')
      const data = await response.json()
      
      if (data.success) {
        setIntegrations(data.integrations)
      } else {
        setError(data.error || 'Failed to load integrations')
      }
    } catch (error) {
      setError('Failed to load integrations')
      console.error('Error fetching integrations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const linkStore = async (organizationId: string, useForceLinking = false) => {
    setLinkingStore(organizationId)
    
    try {
      const endpoint = useForceLinking ? '/api/admin/force-link-store' : '/api/admin/link-store'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Successfully linked ${data.storeName} to your account!`)
        fetchIntegrations() // Refresh the list
      } else {
        console.error('Store linking error:', data)
        const errorDetails = data.details ? `\nDetails: ${data.details}` : ''
        const debugInfo = data.debugInfo ? `\nDebug: ${JSON.stringify(data.debugInfo, null, 2)}` : ''
        alert(`Failed to link store: ${data.error}${errorDetails}${debugInfo}`)
      }
    } catch (err) {
      alert('Failed to link store')
    } finally {
      setLinkingStore(null)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading integrations...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin: Store Integration Management</h1>
            
            <div className="mb-6">
              <p className="text-gray-600">
                <strong>Current User:</strong> {session?.user?.email}
              </p>
              <p className="text-gray-600">
                <strong>Total Integrations:</strong> {integrations.length}
              </p>
              <p className="text-gray-600">
                <strong>Your Accessible Stores:</strong> {integrations.filter(i => i.isUserMember).length}
              </p>
              <p className="text-gray-600">
                <strong>Pending Links:</strong> {integrations.filter(i => i.isPending).length}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className={`border rounded-lg p-6 ${
                  integration.isUserMember ? 'border-green-200 bg-green-50' : 
                  integration.isPending ? 'border-yellow-200 bg-yellow-50' : 
                  'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {integration.name}
                        {integration.isUserMember && <span className="ml-2 text-sm text-green-600">(Your Store)</span>}
                        {integration.isPending && <span className="ml-2 text-sm text-yellow-600">(Pending Link)</span>}
                      </h3>
                      <p className="text-gray-600">{integration.shopDomain}</p>
                      <p className="text-sm text-gray-500">Status: {integration.status}</p>
                      
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Shop Owner Email:</strong> {integration.shopOwnerEmail || 'N/A'}
                        </div>
                        <div>
                          <strong>Customer Email:</strong> {integration.customerEmail || 'N/A'}
                        </div>
                        <div>
                          <strong>Created:</strong> {new Date(integration.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>Organization:</strong> {integration.organizationName}
                        </div>
                      </div>

                      {integration.members.length > 0 && (
                        <div className="mt-3">
                          <strong className="text-sm text-gray-700">Members:</strong>
                          <div className="mt-1 space-y-1">
                            {integration.members.map((member, index) => (
                              <div key={index} className="text-sm text-gray-600">
                                {member.email} ({member.role})
                                {member.email === session?.user?.email && <span className="text-green-600 font-medium"> - You</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 space-y-2">
                      {!integration.isUserMember && (
                        <div className="space-y-2">
                          <button
                            onClick={() => linkStore(integration.organizationId, false)}
                            disabled={linkingStore === integration.organizationId}
                            className={`w-full px-4 py-2 rounded-lg font-medium ${
                              linkingStore === integration.organizationId
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white transition-colors`}
                          >
                            {linkingStore === integration.organizationId ? 'Linking...' : 'Link to My Account'}
                          </button>
                          <button
                            onClick={() => linkStore(integration.organizationId, true)}
                            disabled={linkingStore === integration.organizationId}
                            className={`w-full px-3 py-1 text-sm rounded-lg font-medium ${
                              linkingStore === integration.organizationId
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-orange-600 hover:bg-orange-700'
                            } text-white transition-colors`}
                          >
                            Force Link
                          </button>
                        </div>
                      )}
                      
                      {integration.isUserMember && (
                        <a
                          href={`/dashboard?organizationId=${integration.organizationId}`}
                          className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          View Dashboard
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {integrations.length === 0 && !error && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations found</h3>
                <p className="mt-1 text-sm text-gray-500">Connect your first Shopify store to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}