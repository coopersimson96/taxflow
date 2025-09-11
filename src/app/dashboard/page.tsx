'use client'

import { Component, ReactNode, Suspense } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import TaxAnalyticsDashboard from '@/components/analytics/TaxAnalyticsDashboard'
import DashboardPolaris from './dashboard-polaris'
import { useEmbedded } from '@/hooks/useEmbedded'
import { useStore } from '@/contexts/StoreContext'

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

function DashboardContent() {
  const { isEmbedded, isLoading: isEmbeddedLoading } = useEmbedded()
  const { stores, currentStore, setCurrentStore, loading: storeLoading, error: storeError } = useStore()

  // Use Polaris UI when embedded
  if (isEmbedded) {
    return <DashboardPolaris />
  }
  
  // Show loading state while detecting embedded mode or loading stores
  if (isEmbeddedLoading || storeLoading) {
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

  // Error state
  if (storeError) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="text-red-800 font-semibold">Error Loading Stores</h3>
            <p className="text-red-600">{storeError}</p>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // No stores connected
  if (stores.length === 0) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Stores Connected</h2>
            <p className="text-gray-600 mb-6">Connect your Shopify store to start tracking tax analytics.</p>
            <a href="/connect" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              Connect Store
            </a>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Store selector (when multiple stores)
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
              value={currentStore?.id || ''}
              onChange={(e) => {
                const store = stores.find(s => s.id === e.target.value)
                if (store) setCurrentStore(store)
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.shopDomain})
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
            {currentStore && (
              <TaxAnalyticsDashboard 
                organizationId={currentStore.organizationId}
                integrationId={currentStore.id}
              />
            )}
          </div>
        </ErrorBoundary>
      </DashboardLayout>
    </AuthGuard>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
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
    }>
      <DashboardContent />
    </Suspense>
  )
}