import React from 'react'
import { CheckCircle, AlertTriangle, TrendingUp, Clock, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MonthlyTrackingData {
  month: string
  year: number
  totalTaxToTrack: number
  totalSetAside: number
  totalRemaining: number
  currency: string
  payoutCount: number
  averagePerPayout: number
  completionPercentage: number
}

interface MonthlyTrackingCardProps {
  data?: MonthlyTrackingData | null
  isLoading?: boolean
  onViewReport?: () => void
  className?: string
}

const MonthlyTrackingCard: React.FC<MonthlyTrackingCardProps> = ({
  data,
  isLoading = false,
  onViewReport,
  className
}) => {
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 80) {
      return {
        text: 'On Track',
        className: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md transform transition-all duration-300 hover:scale-105',
        pulse: false
      }
    } else if (percentage >= 50) {
      return {
        text: 'Falling Behind',
        className: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md transform transition-all duration-300 hover:scale-105',
        pulse: false
      }
    } else {
      return {
        text: 'Action Needed',
        className: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md animate-pulse transform transition-all duration-300 hover:scale-105',
        pulse: true
      }
    }
  }

  const getRemainingAmountColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  // Loading State
  if (isLoading) {
    return (
      <div className={cn("w-full h-full", className)}>
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-4 md:p-8 animate-pulse h-full flex flex-col justify-center">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8 space-y-4 sm:space-y-0">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-32 sm:w-48"></div>
            <div className="h-6 bg-gray-200 rounded w-20 sm:w-24"></div>
          </div>
          <div className="space-y-4 md:space-y-6">
            <div className="h-12 sm:h-16 bg-gray-200 rounded w-60 sm:w-80"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="h-16 sm:h-20 bg-gray-200 rounded"></div>
              <div className="h-16 sm:h-20 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0">
              <div className="h-4 bg-gray-200 rounded w-28 sm:w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-28 sm:w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cn("w-full h-full", className)}>
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-4 md:p-8 h-full flex flex-col justify-center">
          <div className="text-center py-8 md:py-12">
            <BarChart3 className="w-12 h-12 md:w-16 md:h-16 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-zinc-700 mb-2">No Monthly Data</h3>
            <p className="text-sm md:text-base text-zinc-500">Start tracking payouts to see your monthly progress</p>
          </div>
        </div>
      </div>
    )
  }

  const status = getStatusBadge(data.completionPercentage)

  return (
    <div className={cn("w-full h-full group", className)}>
      <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl shadow-lg border border-zinc-200/50 p-4 md:p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 h-full flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
              {data.month.toUpperCase()} {data.year}
            </h2>
          </div>
          <div className={cn(
            "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold self-start sm:self-center",
            status.className
          )}>
            {status.text}
          </div>
        </div>

        {/* Large Display Row */}
        <div className="mb-4 md:mb-6">
          <div className="text-xs sm:text-sm uppercase tracking-wide text-zinc-500 font-semibold mb-2">
            TOTAL TAX COLLECTED THIS MONTH
          </div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900">
            {formatCurrency(data.totalTaxToTrack, data.currency)}
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 my-4 md:my-6 flex-grow">
          {/* Set Aside */}
          <div className="bg-green-50 rounded-2xl p-4 md:p-6 border border-green-200 transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <div className="text-xs sm:text-sm font-semibold text-green-900 uppercase tracking-wide">
                SET ASIDE
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">
              {formatCurrency(data.totalSetAside, data.currency)}
            </div>
          </div>

          {/* Still Need */}
          <div className="bg-orange-50 rounded-2xl p-4 md:p-6 border border-orange-200 transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <div className="text-xs sm:text-sm font-semibold text-orange-900 uppercase tracking-wide">
                STILL NEED
              </div>
            </div>
            <div className={cn(
              "text-2xl sm:text-3xl font-bold",
              getRemainingAmountColor(data.completionPercentage)
            )}>
              {formatCurrency(data.totalRemaining, data.currency)}
            </div>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="my-6 md:my-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs sm:text-sm font-semibold text-zinc-700">Progress</span>
            <span className="text-xs sm:text-sm font-semibold text-zinc-700">
              {Math.round(data.completionPercentage)}%
            </span>
          </div>
          <div className="relative">
            <div className="w-full h-3 sm:h-4 bg-gray-300 rounded-full relative">
              {/* Progress bar fill */}
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  backgroundColor: '#119F53',
                  width: `${Math.max(Math.min(data.completionPercentage, 100), 2)}%`
                }}
              />
            </div>
            {/* Celebration effect for high completion */}
            {data.completionPercentage >= 90 && (
              <div className="absolute -top-1 -right-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-xs">✨</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:items-center text-xs sm:text-sm text-zinc-600 mb-4 md:mb-6">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{data.payoutCount} payouts this month</span>
          </div>
          <div>
            <span>Avg tax: {formatCurrency(data.payoutCount > 0 ? data.totalTaxToTrack / data.payoutCount : 0, data.currency)} per payout</span>
          </div>
        </div>

        {/* View Report Button */}
        <div className="text-center">
          <button
            onClick={onViewReport}
            className="group text-green-600 font-semibold hover:text-green-800 transition-all duration-300 inline-flex items-center space-x-2 transform hover:scale-105 active:scale-95 min-h-[44px] px-4 py-2 text-sm sm:text-base"
          >
            <span>View Detailed Report</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MonthlyTrackingCard