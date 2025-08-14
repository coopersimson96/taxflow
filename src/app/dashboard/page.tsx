'use client'

import { useEffect, useState, Component, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import TaxAnalyticsDashboard from '@/components/analytics/TaxAnalyticsDashboard'

interface Store {
  integrationId: string
  organizationId: string
  organizationName: string
  storeName: string
  shopDomain: string
  role: string
  createdAt: string
  lastSyncAt: string | null
}

// Simple Error Boundary
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: ReactNode}) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Dashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-red-800 font-semibold">Dashboard Error</h3>
          <p className="text-red-600">Something went wrong loading the tax analytics dashboard.</p>
          <p className="text-sm text-gray-600 mt-2">{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}


export default function DashboardPage() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [stores, setStores] = useState<Store[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('')
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [storeError, setStoreError] = useState<string | null>(null)
  
  // Get organizationId from URL params
  const urlOrganizationId = searchParams.get('organizationId')
  
  // Debug logging - simplified
  useEffect(() => {
    console.log('🎯 Dashboard mounted:', {
      sessionStatus: status,
      sessionEmail: session?.user?.email,
      timestamp: new Date().toISOString()
    })
  }, [status, session])
  
  // Fetch available stores when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchStores()
    }
  }, [status])
  
  const fetchStores = async () => {
    try {
      setIsLoadingStores(true)
      const response = await fetch('/api/debug/list-stores')
      const data = await response.json()
      
      if (data.success) {
        setStores(data.stores)
        // Use URL organizationId if provided, otherwise auto-select first store
        if (urlOrganizationId) {
          setSelectedOrganizationId(urlOrganizationId)
        } else if (data.stores.length > 0 && !selectedOrganizationId) {
          setSelectedOrganizationId(data.stores[0].organizationId)
        }
      } else {
        setStoreError(data.error || 'Failed to load stores')
      }
    } catch (error) {
      setStoreError('Failed to load stores')
      console.error('Error fetching stores:', error)
    } finally {
      setIsLoadingStores(false)
    }
  }
  
  // Loading state
  if (status === 'loading' || isLoadingStores) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Store selection UI (when multiple stores)
  const StoreSelector = () => {
    if (stores.length <= 1) return null
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Select Store</h3>
            <p className="text-sm text-gray-500">Choose which store's tax data to view</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedOrganizationId}
              onChange={(e) => setSelectedOrganizationId(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {stores.map((store) => (
                <option key={store.organizationId} value={store.organizationId}>
                  {store.storeName} ({store.shopDomain})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <ErrorBoundary>
          <div className="space-y-6">
            <StoreSelector />
            <TaxAnalyticsDashboard 
              organizationId={selectedOrganizationId}
            />
          </div>
        </ErrorBoundary>
      </DashboardLayout>
    </AuthGuard>
  )
}