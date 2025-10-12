import React, { lazy, Suspense, useCallback } from 'react'
import { useTaxDashboard } from '@/hooks/useTaxDashboard'
import { useDailyPayout } from '@/hooks/useDailyPayout'
import { useMonthlyTracking } from '@/hooks/useMonthlyTracking'
import { useRecentPayouts } from '@/hooks/useRecentPayouts'
// Lazy load dashboard components for better performance
const HeroPayoutCard = lazy(() => import('./HeroPayoutCard'))
const MonthlyTrackingCard = lazy(() => import('./MonthlyTrackingCard'))
const RecentPayoutsList = lazy(() => import('./RecentPayoutsList'))
const QuickActionsFooter = lazy(() => import('./QuickActionsFooter'))
import { cn } from '@/lib/utils'
import { exportPayoutData, exportMonthlyTaxSummary } from '@/lib/csv-export'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  
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
    isLoading: monthlyLoading,
    refresh: refreshMonthlyTracking
  } = useMonthlyTracking()
  
  // Wrap set aside functions to also refresh monthly tracking
  const handleConfirmSetAside = useCallback(async () => {
    await confirmSetAside()
    // Wait a bit for the backend to update, then refresh monthly data
    setTimeout(() => {
      refreshMonthlyTracking()
    }, 1500)
  }, [confirmSetAside, refreshMonthlyTracking])
  
  const handleUndoSetAside = useCallback(async () => {
    await undoSetAside()
    // Wait a bit for the backend to update, then refresh monthly data
    setTimeout(() => {
      refreshMonthlyTracking()
    }, 1500)
  }, [undoSetAside, refreshMonthlyTracking])
  
  const handleRecentPayoutSetAside = useCallback(async (payoutId: string) => {
    await setPayoutAsAside(payoutId)
    // Wait a bit for the backend to update, then refresh monthly data
    setTimeout(() => {
      refreshMonthlyTracking()
    }, 1500)
  }, [setPayoutAsAside, refreshMonthlyTracking])

  const {
    payouts: recentPayouts,
    isLoading: payoutsLoading,
    setPayoutAsAside
  } = useRecentPayouts()

  // Show loading state for initial load
  if (isInitialLoading) {
    return (
      <div className={cn("space-y-6 md:space-y-8", className)}>
        {/* Hero section skeleton */}
        <div className="h-64 sm:h-80 bg-gray-200 rounded-2xl animate-pulse"></div>
      </div>
    )
  }

  // Show error state
  if (state.error) {
    return (
      <div className={cn("space-y-6 md:space-y-8", className)}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="min-w-0 flex-1">
              <h3 className="text-base md:text-lg font-semibold text-red-900">Error Loading Dashboard</h3>
              <p className="text-sm md:text-base text-red-700 mt-1 break-words">{state.error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show no data state - Shopify store not connected
  if (!data) {
    return (
      <div className={cn("space-y-6 md:space-y-8", className)}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Connect Your Shopify Store</h2>
            <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">
              Start tracking your tax obligations by connecting your Shopify store.
            </p>
            <button
              onClick={() => window.location.href = '/connect'}
              className="inline-flex items-center px-4 md:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px] text-sm md:text-base w-full sm:w-auto justify-center"
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
    <div className={cn("space-y-6 md:space-y-8 animate-fade-in-up", className)}>
      {/* Hero Cards Row - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 animate-slide-in-top animate-delay-100 items-stretch text-center lg:text-left">
        {/* Hero Payout Card */}
        <div className="lg:col-span-1 h-full min-h-[500px] sm:min-h-[600px] animate-scale-in animate-delay-200">
          <Suspense fallback={
            <div className="h-full bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          }>
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
              onConfirmSetAside={handleConfirmSetAside}
              onUndo={handleUndoSetAside}
            />
          </Suspense>
        </div>

        {/* Monthly Tracking Summary Card */}
        <div className="lg:col-span-1 h-full min-h-[500px] sm:min-h-[600px] animate-scale-in animate-delay-300">
          <Suspense fallback={
            <div className="h-full bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-12 bg-gray-200 rounded mb-6"></div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          }>
            <MonthlyTrackingCard
              data={monthlyData}
              isLoading={monthlyLoading}
              onViewReport={() => {
                router.push('/reports')
              }}
            />
          </Suspense>
        </div>
      </div>

      {/* Recent Payouts List */}
      <div className="animate-fade-in-up animate-delay-500 w-full">
        <Suspense fallback={
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        }>
          <RecentPayoutsList
          payouts={recentPayouts}
          isLoading={payoutsLoading}
          onSetAside={handleRecentPayoutSetAside}
          onExportPayout={(payoutId) => {
            const payout = recentPayouts.find(p => p.id === payoutId)
            if (payout) {
              exportPayoutData([payout])
            }
          }}
          />
        </Suspense>
      </div>

      {/* Quick Actions Footer */}
      <div className="animate-slide-in-top animate-delay-500 w-full">
        <Suspense fallback={
          <div className="bg-slate-50 rounded-lg p-4 border-t border-slate-200 animate-pulse">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded flex-1 sm:flex-initial min-w-[140px]"></div>
              ))}
            </div>
          </div>
        }>
          <QuickActionsFooter
          onMonthlyReport={() => {
            router.push('/reports')
          }}
          onExportAll={() => {
            // Export all recent payouts
            if (recentPayouts.length > 0) {
              exportPayoutData(recentPayouts)
            }
            // Export monthly summary if available
            if (monthlyData) {
              setTimeout(() => {
                exportMonthlyTaxSummary(monthlyData)
              }, 500)
            }
          }}
          onSettings={() => {
            router.push('/settings')
          }}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default TaxAnalyticsDashboard