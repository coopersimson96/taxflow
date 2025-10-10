import React from 'react'
import { useTaxDashboard } from '@/hooks/useTaxDashboard'
import { useDailyPayout } from '@/hooks/useDailyPayout'
import { useMonthlyTracking } from '@/hooks/useMonthlyTracking'
import { useRecentPayouts } from '@/hooks/useRecentPayouts'
import HeroPayoutCard from './HeroPayoutCard'
import MonthlyTrackingCard from './MonthlyTrackingCard'
import RecentPayoutsList from './RecentPayoutsList'
import QuickActionsFooter from './QuickActionsFooter'
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

  const { 
    data: payoutData, 
    isLoading: payoutLoading,
    confirmSetAside,
    undoSetAside 
  } = useDailyPayout()

  const {
    data: monthlyData,
    isLoading: monthlyLoading
  } = useMonthlyTracking()

  const {
    payouts: recentPayouts,
    isLoading: payoutsLoading,
    setPayoutAsAside
  } = useRecentPayouts()

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
      {/* Hero Cards Row - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hero Payout Card */}
        <div className="lg:col-span-1">
          <HeroPayoutCard
            data={payoutData ? {
              amount: payoutData.payoutAmount,
              currency: payoutData.currency,
              taxToSetAside: payoutData.taxToSetAside,
              safeToSpend: payoutData.safeToSpend,
              orderCount: payoutData.orderCount,
              date: payoutData.date,
              dateRange: payoutData.dateRange,
              isConfirmed: payoutData.isSetAside
            } : null}
            state={
              payoutData?.isSetAside 
                ? 'confirmed' 
                : payoutData?.hasPayoutToday 
                  ? 'payout_received' 
                  : 'no_payout'
            }
            isLoading={payoutLoading}
            onConfirmSetAside={confirmSetAside}
            onUndo={undoSetAside}
          />
        </div>

        {/* Monthly Tracking Summary Card */}
        <div className="lg:col-span-1">
          <MonthlyTrackingCard
            data={monthlyData}
            isLoading={monthlyLoading}
            onViewReport={() => {
              // TODO: Navigate to detailed monthly report
              console.log('Navigate to monthly report')
            }}
          />
        </div>
      </div>

      {/* Recent Payouts List */}
      <RecentPayoutsList
        payouts={recentPayouts}
        isLoading={payoutsLoading}
        onSetAside={setPayoutAsAside}
        onExportPayout={(payoutId) => {
          // TODO: Implement payout export functionality
          console.log('Export payout:', payoutId)
        }}
      />

      {/* Quick Actions Footer */}
      <QuickActionsFooter
        onMonthlyReport={() => {
          // TODO: Navigate to monthly report page
          console.log('Navigate to monthly report')
        }}
        onExportAll={() => {
          // TODO: Implement export all functionality
          console.log('Export all current month data')
        }}
        onSettings={() => {
          // TODO: Navigate to settings page
          console.log('Navigate to settings')
        }}
      />
    </div>
  )
}

export default TaxAnalyticsDashboard