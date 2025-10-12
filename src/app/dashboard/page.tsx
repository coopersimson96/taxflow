'use client'

import { Component, ReactNode, Suspense } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import TaxAnalyticsDashboard from '@/components/analytics/TaxAnalyticsDashboard'
import DashboardPolaris from './dashboard-polaris'
import { useEmbedded } from '@/hooks/useEmbedded'
import { useStore } from '@/contexts/StoreContext'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()

  // Helper functions for premium layout
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getUserFirstName = () => {
    if (session?.user?.name) {
      return session.user.name.split(' ')[0]
    }
    return 'there'
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

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
              <div className="animate-spin w-8 h-8 border-4 border-primary-900 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-secondary">Loading...</p>
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
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-primary-900">Store Management</h3>
            <p className="text-sm text-muted">
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
                className="input-field"
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
              className="btn-primary"
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

  // If we have a current store, show the premium Chosenly-inspired layout
  if (currentStore) {
    return (
      <AuthGuard>
        <DashboardLayout>
          {/* Premium Dashboard Layout - Negative margins to expand beyond DashboardLayout's container */}
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 min-h-[calc(100vh-4rem)]" style={{ backgroundColor: '#F3F3E4' }}>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
            <ErrorBoundary>
              <div className="space-y-6 md:space-y-10">
                
                {/* Page Header with Greeting - Card Wrapper */}
                <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-4 md:p-6 animate-fade-in-up">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 text-center md:text-left">
                    {/* Left side: Greeting and Date */}
                    <div>
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-900">
                        {getGreeting()}, {getUserFirstName()}
                      </h1>
                      <p className="text-sm sm:text-base text-zinc-600 mt-1">
                        {formatDate()}
                      </p>
                    </div>
                    
                    {/* Right side: Shopify Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 items-center">
                      {stores.length > 1 && (
                        <select
                          value={currentStore?.id || ''}
                          onChange={(e) => {
                            const store = stores.find(s => s.id === e.target.value)
                            if (store) setCurrentStore(store)
                          }}
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px] w-full sm:w-auto"
                        >
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 sm:px-4 py-2 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs sm:text-sm font-medium">Connected to {currentStore.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Content */}
                <div className="w-full">
                  <TaxAnalyticsDashboard 
                    organizationId={currentStore.organizationId}
                    integrationId={currentStore.id}
                  />
                </div>
                
              </div>
            </ErrorBoundary>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Fallback to original layout for store management and setup
  return (
    <AuthGuard>
      <DashboardLayout>
        <ErrorBoundary>
          <div className="space-y-6">
            <StoreSelector />
            {stores.length === 0 ? (
              <div className="card p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-primary-900">Get Started with Tax Tracking</h3>
                <p className="mt-1 text-sm text-secondary">
                  Connect your Shopify store to automatically track sales tax across all your transactions.
                </p>
                <div className="mt-6">
                  <a
                    href="/connect"
                    className="btn-primary text-base px-6 py-3"
                  >
                    Connect Your First Store
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-warning-800">No Store Selected</h3>
                    <div className="mt-2 text-sm text-warning-700">
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
              <div className="animate-spin w-8 h-8 border-4 border-primary-900 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-secondary">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    }>
      <DashboardContent />
    </Suspense>
  )
}