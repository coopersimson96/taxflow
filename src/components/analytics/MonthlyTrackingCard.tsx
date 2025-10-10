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
        className: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md',
        pulse: false
      }
    } else if (percentage >= 50) {
      return {
        text: 'Falling Behind',
        className: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md',
        pulse: false
      }
    } else {
      return {
        text: 'Action Needed',
        className: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md animate-pulse',
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
      <div className={cn("max-w-3xl mx-auto", className)}>
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-8 animate-pulse">
          <div className="flex justify-between items-center mb-8">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="space-y-6">
            <div className="h-16 bg-gray-200 rounded w-80"></div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cn("max-w-3xl mx-auto", className)}>
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/50 p-8">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-700 mb-2">No Monthly Data</h3>
            <p className="text-zinc-500">Start tracking payouts to see your monthly progress</p>
          </div>
        </div>
      </div>
    )
  }

  const status = getStatusBadge(data.completionPercentage)

  return (
    <div className={cn("max-w-3xl mx-auto group", className)}>
      <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl shadow-lg border border-zinc-200/50 p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <h2 className="text-2xl font-bold text-zinc-900">
              {data.month.toUpperCase()} {data.year}
            </h2>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold",
            status.className
          )}>
            {status.text}
          </div>
        </div>

        {/* Large Display Row */}
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wide text-zinc-500 font-semibold mb-2">
            TOTAL TAX TO TRACK THIS MONTH
          </div>
          <div className="text-5xl font-bold text-zinc-900">
            {formatCurrency(data.totalTaxToTrack, data.currency)}
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-2 gap-6 my-6">
          {/* Set Aside */}
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div className="text-sm font-semibold text-green-900 uppercase tracking-wide">
                SET ASIDE
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(data.totalSetAside, data.currency)}
            </div>
          </div>

          {/* Still Need */}
          <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div className="text-sm font-semibold text-orange-900 uppercase tracking-wide">
                STILL NEED
              </div>
            </div>
            <div className={cn(
              "text-3xl font-bold",
              getRemainingAmountColor(data.completionPercentage)
            )}>
              {formatCurrency(data.totalRemaining, data.currency)}
            </div>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="my-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-zinc-700">Progress</span>
            <span className="text-sm font-semibold text-zinc-700">
              {Math.round(data.completionPercentage)}%
            </span>
          </div>
          <div className="relative">
            <div className="w-full h-4 bg-zinc-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-inner transition-all duration-700 ease-out"
                style={{ width: `${Math.min(data.completionPercentage, 100)}%` }}
              />
            </div>
            {/* Celebration effect for high completion */}
            {data.completionPercentage >= 90 && (
              <div className="absolute -top-1 -right-1">
                <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-xs">✨</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex justify-between items-center text-sm text-zinc-600 mb-6">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{data.payoutCount} payouts this month</span>
          </div>
          <div>
            <span>Avg: {formatCurrency(data.averagePerPayout, data.currency)} per payout</span>
          </div>
        </div>

        {/* View Report Button */}
        <div className="text-center">
          <button
            onClick={onViewReport}
            className="text-purple-600 font-semibold hover:text-purple-800 transition-colors duration-200 inline-flex items-center space-x-2 group/btn"
          >
            <span>View Detailed Report</span>
            <span className="group-hover/btn:translate-x-1 transition-transform duration-200">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MonthlyTrackingCard