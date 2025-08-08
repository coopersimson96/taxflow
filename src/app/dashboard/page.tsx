'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { ConnectionStatus } from '@/components/shopify/ConnectionStatus'
import TaxAnalyticsDashboard from '@/components/analytics/TaxAnalyticsDashboard'

interface UserOrganization {
  id: string
  name: string
  slug: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('')
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true)
  const [hasShopifyConnection, setHasShopifyConnection] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  
  // Fetch user's organizations on mount
  useEffect(() => {
    const fetchUserOrganizations = async () => {
      if (!session?.user?.email) return

      try {
        setIsLoadingOrgs(true)
        
        // For now, create a mock organization - in production you'd fetch from your API
        const mockOrganization: UserOrganization = {
          id: 'demo-org-1',
          name: 'Demo Store',
          slug: 'demo-store'
        }
        
        setUserOrganizations([mockOrganization])
        setSelectedOrganizationId(mockOrganization.id)
        
        // Check for Shopify connection
        setIsCheckingConnection(true)
        // Force connection as true to show dashboard immediately
        setHasShopifyConnection(true) 
        setIsCheckingConnection(false)
        
      } catch (error) {
        console.error('Error fetching organizations:', error)
      } finally {
        setIsLoadingOrgs(false)
      }
    }

    fetchUserOrganizations()
  }, [session])

  const handleConnect = () => {
    console.log('Connect button clicked - navigating to /connect')
    try {
      router.push('/connect')
      console.log('Navigation initiated successfully')
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to window.location if router fails
      window.location.href = '/connect'
    }
  }

  const handleConnectionStatusChange = (isConnected: boolean) => {
    setHasShopifyConnection(isConnected)
  }

  // Show loading state while checking organizations
  if (isLoadingOrgs) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Show organization selection if multiple organizations
  if (userOrganizations.length === 0) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M9 7h6m-6 4h6m-6 4h6m-6 4h6" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Organizations Found</h3>
            <p className="mt-2 text-sm text-gray-500">
              You need to be part of an organization to view the tax dashboard.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/setup')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Organization
              </button>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Organization selector if multiple organizations */}
          {userOrganizations.length > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label htmlFor="organization-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Organization
              </label>
              <select
                id="organization-select"
                value={selectedOrganizationId}
                onChange={(e) => setSelectedOrganizationId(e.target.value)}
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {userOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Connection Status */}
          <ConnectionStatus 
            onConnect={handleConnect}
            isConnected={hasShopifyConnection}
            isLoading={isCheckingConnection}
            onConnectionChange={handleConnectionStatusChange}
          />

          {/* Main Dashboard Content */}
          {selectedOrganizationId && (
            <TaxAnalyticsDashboard 
              organizationId={selectedOrganizationId}
            />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}