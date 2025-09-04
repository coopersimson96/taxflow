import React, { useState } from 'react'
import { useTaxDashboard, filterPresets } from '@/hooks/useTaxDashboard'
import TaxHeroSection from './TaxHeroSection'
import TaxSummaryCards from './TaxSummaryCards'
import TaxBreakdown from './TaxBreakdown'
import TaxTrendsChart from './TaxTrendsChart'
import OrderBreakdown from './OrderBreakdown'
import DailyPayoutBreakdown from './DailyPayoutBreakdown'
import { ChartConfig } from '@/types/tax-dashboard'
import { cn } from '@/lib/utils'

interface TaxAnalyticsDashboardProps {
  organizationId: string
  className?: string
}

const TaxAnalyticsDashboard: React.FC<TaxAnalyticsDashboardProps> = ({
  organizationId,
  className
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends' | 'orders' | 'jurisdictions' | 'payouts'>('overview')
  
  const { data, state, filters, updateFilters, refresh, isInitialLoading, integrationId } = useTaxDashboard({
    organizationId,
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  })

  const chartConfig: ChartConfig = {
    colors: {
      primary: '#3b82f6',
      secondary: '#10b981',
      gst: '#10b981',
      pst: '#3b82f6',
      hst: '#8b5cf6',
      qst: '#f59e0b',
      stateTax: '#ef4444',
      localTax: '#84cc16',
      other: '#6b7280'
    },
    gradients: {
      primary: ['#3b82f6', '#1d4ed8'],
      tax: ['#10b981', '#059669']
    }
  }

  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'trends',
      name: 'Trends',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      id: 'orders',
      name: 'Orders',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 10H6L5 9z" />
        </svg>
      )
    },
    {
      id: 'jurisdictions',
      name: 'Jurisdictions',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'payouts',
      name: 'Payouts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ]

  const presetButtons = [
    { key: 'today', label: 'Today' },
    { key: 'thisWeek', label: '7 Days' },
    { key: 'thisMonth', label: '30 Days' },
    { key: 'thisQuarter', label: '90 Days' },
    { key: 'thisYear', label: '1 Year' }
  ]

  const handlePresetClick = (presetKey: keyof typeof filterPresets) => {
    updateFilters(filterPresets[presetKey])
  }

  // Show loading state for initial load
  if (isInitialLoading) {
    return (
      <div className={cn("space-y-8", className)}>
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="flex space-x-2">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-10 w-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero section skeleton */}
        <div className="h-80 bg-gray-200 rounded-2xl animate-pulse"></div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
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
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
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
              Once connected, you'll see real-time tax analytics, daily payout breakdowns, 
              and jurisdiction-specific tax information.
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
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Real-time Analytics</div>
                  <div className="text-gray-500">Track tax collected across all jurisdictions</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Payout Breakdowns</div>
                  <div className="text-gray-500">See tax amounts for each daily payout</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Tax Compliance</div>
                  <div className="text-gray-500">Stay compliant with automated tracking</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {data?.storeInfo?.storeName || 'Your Store'} Tax Dashboard
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Last updated: {new Date(state.lastRefresh).toLocaleTimeString()}</span>
            <div className="flex items-center space-x-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                state.dataFreshness === 'fresh' && "bg-green-500",
                state.dataFreshness === 'stale' && "bg-yellow-500",
                state.dataFreshness === 'outdated' && "bg-red-500"
              )}></div>
              <span className="capitalize">{state.dataFreshness}</span>
            </div>
          </div>
        </div>
        
        {/* Refresh button only */}
        <button
          onClick={refresh}
          disabled={state.isLoading}
          className={cn(
            "flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",
            state.isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <svg 
            className={cn("w-4 h-4", state.isLoading && "animate-spin")} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{state.isLoading ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>


      {/* Tax Money to Set Aside - Hero Section */}
      <TaxHeroSection 
        data={data.taxToSetAside} 
        isLoading={state.isLoading}
      />

      {/* Timeframe Selector - Controls data below */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Analytics Timeframe</h3>
            <p className="text-xs text-gray-500 mt-1">Select time period for the data below</p>
          </div>
          
          {/* Date range presets */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {presetButtons.map(preset => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset.key as keyof typeof filterPresets)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded transition-colors",
                  filters.dateRange.preset === preset.key.replace('this', '').toLowerCase().replace('week', '7days').replace('month', '30days').replace('quarter', '90days').replace('year', '1year')
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <TaxSummaryCards 
        metrics={data.summaryMetrics}
        comparison={data.periodComparison}
        isLoading={state.isLoading}
      />

      {/* Navigation tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={cn(
                "flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                selectedTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="space-y-8">
        {selectedTab === 'overview' && (
          <div className="space-y-8">
            <TaxBreakdown 
              breakdown={data.taxBreakdown}
              isLoading={state.isLoading}
            />
          </div>
        )}

        {selectedTab === 'trends' && (
          <TaxTrendsChart 
            data={data.trendData}
            config={chartConfig}
            isLoading={state.isLoading}
          />
        )}

        {selectedTab === 'orders' && (
          <OrderBreakdown 
            orders={data.recentOrders}
            isLoading={state.isLoading}
          />
        )}

        {selectedTab === 'jurisdictions' && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Tax by Jurisdiction</h3>
            
            {data.jurisdictionData.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No jurisdiction data</h3>
                <p className="mt-1 text-sm text-gray-500">Jurisdiction breakdown will appear here once you have orders with tax collection.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.jurisdictionData
                  .sort((a, b) => b.totalTax - a.totalTax)
                  .map((jurisdiction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{jurisdiction.jurisdiction}</div>
                        <div className="text-sm text-gray-600">
                          {jurisdiction.orderCount} orders • {(jurisdiction.taxRate).toFixed(1)}% avg rate
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ${jurisdiction.totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-600">
                          ${jurisdiction.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} sales
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'payouts' && (
          <DailyPayoutBreakdown 
            payouts={data.upcomingPayouts || []}
            isLoading={state.isLoading}
            storeInfo={data.storeInfo}
          />
        )}
      </div>
    </div>
  )
}

export default TaxAnalyticsDashboard