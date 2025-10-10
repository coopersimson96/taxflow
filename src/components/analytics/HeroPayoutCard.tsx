import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, Calendar, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PayoutData {
  amount: number
  currency: string
  taxToSetAside: number
  safeToSpend: number
  orderCount: number
  date: string
  dateRange: string
  isConfirmed?: boolean
}

interface HeroPayoutCardProps {
  data?: PayoutData | null
  state: 'payout_received' | 'no_payout' | 'confirmed'
  isLoading?: boolean
  onConfirmSetAside?: () => void
  onUndo?: () => void
  className?: string
}

const HeroPayoutCard: React.FC<HeroPayoutCardProps> = ({
  data,
  state,
  isLoading = false,
  onConfirmSetAside,
  onUndo,
  className
}) => {
  const [isProcessing, setIsProcessing] = useState(false)

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const handleConfirmSetAside = async () => {
    if (!onConfirmSetAside) return
    
    setIsProcessing(true)
    try {
      await onConfirmSetAside()
    } finally {
      setIsProcessing(false)
    }
  }

  // Loading State
  if (isLoading) {
    return (
      <div className={cn("max-w-3xl mx-auto", className)}>
        <div className="bg-white rounded-2xl shadow-xl p-10 animate-pulse">
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
              <div className="h-16 bg-gray-200 rounded w-80 mx-auto"></div>
              <div className="h-6 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
            <div className="flex justify-center space-x-4">
              <div className="h-12 bg-gray-200 rounded w-32"></div>
              <div className="h-12 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STATE 3: CONFIRMED SET ASIDE
  if (state === 'confirmed' && data) {
    return (
      <div className={cn("max-w-3xl mx-auto", className)}>
        <div className="bg-green-100 rounded-2xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold text-green-900">
                  Today's payout of {formatCurrency(data.amount, data.currency)} set aside for taxes ✓
                </div>
                <div className="text-sm text-green-700 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
                    Completed {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            {onUndo && (
              <button 
                onClick={onUndo}
                className="text-sm text-green-600 hover:text-green-900 underline transition-colors"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // STATE 2: NO PAYOUT TODAY
  if (state === 'no_payout') {
    return (
      <div className={cn("max-w-3xl mx-auto", className)}>
        <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-10">
          <div className="text-center space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">
                NEXT PAYOUT EXPECTED
              </div>
              <div className="text-7xl font-bold text-zinc-400">
                ~{formatCurrency(data?.amount || 0, data?.currency)}
              </div>
              <div className="text-base text-zinc-400">
                estimated based on recent activity
              </div>
            </div>

            {/* Estimated amounts */}
            <div className="my-8 space-y-6">
              <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <div className="text-sm font-semibold text-orange-900 uppercase tracking-wide">
                    Estimated Tax to Set Aside
                  </div>
                </div>
                <div className="text-4xl font-bold text-orange-600">
                  ~{formatCurrency(data?.taxToSetAside || 0, data?.currency)}
                </div>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="text-sm font-semibold text-green-900 uppercase tracking-wide">
                    Estimated Safe to Spend
                  </div>
                </div>
                <div className="text-4xl font-bold text-green-600">
                  ~{formatCurrency(data?.safeToSpend || 0, data?.currency)}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                <Bell className="w-5 h-5" />
                <span>Remind Me Tomorrow</span>
              </button>
            </div>

            {/* Footer metadata */}
            <div className="flex justify-center space-x-6 text-sm text-zinc-500 mt-6">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{data?.dateRange || 'Today'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STATE 1: PAYOUT RECEIVED TODAY (default)
  if (!data) return null

  return (
    <div className={cn("max-w-3xl mx-auto", className)}>
      <div className="bg-white rounded-2xl shadow-xl p-10">
        <div className="text-center space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">
              TODAY'S PAYOUT RECEIVED
            </div>
            <div className="text-7xl font-bold text-zinc-900">
              {formatCurrency(data.amount, data.currency)}
            </div>
            <div className="text-base text-zinc-600">
              deposited to your bank
            </div>
          </div>

          <div className="my-8 space-y-6">
            {/* Warning section - Tax to set aside */}
            <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div className="text-sm font-semibold text-orange-900 uppercase tracking-wide">
                  SET ASIDE FOR TAXES
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                  Action Required
                </span>
              </div>
              <div className="text-5xl font-bold text-orange-600">
                {formatCurrency(data.taxToSetAside, data.currency)}
              </div>
            </div>

            {/* Success section - Safe to spend */}
            <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-sm font-semibold text-green-900 uppercase tracking-wide">
                  SAFE TO SPEND
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
                  Available Now
                </span>
              </div>
              <div className="text-5xl font-bold text-green-600">
                {formatCurrency(data.safeToSpend, data.currency)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={handleConfirmSetAside}
              disabled={isProcessing}
              className={cn(
                "group relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 overflow-hidden",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="relative flex items-center space-x-2">
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span>{isProcessing ? 'Processing...' : "I've Set This Aside"}</span>
              </div>
            </button>
            
            <button className="bg-white border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-full font-semibold hover:bg-purple-50 transition-all duration-200">
              View {data.orderCount} Orders
            </button>
          </div>

          {/* Footer metadata */}
          <div className="flex justify-center space-x-6 text-sm text-zinc-500 mt-6">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{data.date}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{data.dateRange}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroPayoutCard