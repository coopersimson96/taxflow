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


  // Store selector (always show when stores exist)
  const StoreSelector = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Store Management</h3>
            <p className="text-sm text-gray-500">
              {stores.length === 0 
                ? 'No stores connected' 
                : stores.length === 1 
                  ? 'Managing 1 store' 
                  : `Managing ${stores.length} stores`}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {stores.length > 1 && (
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
            )}
            <a
              href="/connect"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Connect New Store
            </a>
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
            {currentStore ? (
              <TaxAnalyticsDashboard 
                organizationId={currentStore.organizationId}
                integrationId={currentStore.id}
              />
            ) : stores.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Get Started with Tax Tracking</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Connect your Shopify store to automatically track sales tax across all your transactions.
                </p>
                <div className="mt-6">
                  <a
                    href="/connect"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Connect Your First Store
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">No Store Selected</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Please select a store from the dropdown above to view tax analytics.</p>
                    </div>
                  </div>
                </div>
              </div>
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