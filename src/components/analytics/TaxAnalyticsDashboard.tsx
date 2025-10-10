import React from 'react'
import { useTaxDashboard } from '@/hooks/useTaxDashboard'
import TaxHeroSection from './TaxHeroSection'
import { cn } from '@/lib/utils'

interface TaxAnalyticsDashboardProps {
  organizationId: string
  integrationId?: string
  className?: string
}

const TaxAnalyticsDashboard: React.FC<TaxAnalyticsDashboardProps> = ({
  organizationId,
  integrationId: propIntegrationId,
  className
}) => {
  const { data, state, isInitialLoading } = useTaxDashboard({
    organizationId,
    integrationId: propIntegrationId,
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  })

  // Show loading state for initial load
  if (isInitialLoading) {
    return (
      <div className={cn("space-y-8", className)}>
        {/* Hero section skeleton */}
        <div className="h-80 bg-gray-200 rounded-2xl animate-pulse"></div>
      </div>
    )
  }

  // Show error state
  if (state.error) {
    return (
      <div className={cn("space-y-8", className)}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Dashboard</h3>
              <p className="text-red-700 mt-1">{state.error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show no data state - Shopify store not connected
  if (!data) {
    return (
      <div className={cn("space-y-8", className)}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Shopify Store</h2>
            <p className="text-gray-600 mb-8">
              Start tracking your tax obligations by connecting your Shopify store.
            </p>
            <button
              onClick={() => window.location.href = '/connect'}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Connect Shopify Store
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Shopify connection status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">
            Connected to {data?.storeInfo?.storeName || 'Shopify Store'}
          </span>
        </div>
      </div>

      {/* Tax Hero Section */}
      <TaxHeroSection 
        data={data.taxToSetAside} 
        isLoading={state.isLoading}
      />
    </div>
  )
}

export default TaxAnalyticsDashboard