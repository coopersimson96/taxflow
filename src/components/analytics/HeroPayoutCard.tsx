import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, Calendar, Bell, PiggyBank, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
      toast.success('Tax amount set aside successfully!', {
        description: `${formatCurrency(data?.taxToSetAside || 0, data?.currency)} has been marked as set aside.`,
        duration: 4000,
      })
    } catch (error) {
      toast.error('Failed to set aside tax amount', {
        description: 'Please try again or contact support if the problem persists.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Loading State
  if (isLoading) {
    return (
      <div className={cn("w-full h-full", className)}>
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 animate-pulse h-full flex flex-col justify-center">
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-32 sm:w-48 mx-auto"></div>
              <div className="h-12 sm:h-16 bg-gray-200 rounded w-48 sm:w-80 mx-auto"></div>
              <div className="h-6 bg-gray-200 rounded w-40 sm:w-64 mx-auto"></div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="h-12 bg-gray-200 rounded w-full sm:w-32 mx-auto sm:mx-0"></div>
              <div className="h-12 bg-gray-200 rounded w-full sm:w-32 mx-auto sm:mx-0"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STATE 3: CONFIRMED SET ASIDE
  if (state === 'confirmed' && data) {
    return (
      <div className={cn("w-full h-full", className)}>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-4 md:p-8 h-full flex flex-col justify-between border-2 border-green-200">
          <div className="text-center space-y-4 md:space-y-6 flex-grow flex flex-col justify-center">
            {/* Success Header with Animation */}
            <div className="space-y-2">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg transform scale-110 animate-pulse">
                  <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-green-900">
                Tax Set Aside Complete! ✓
              </h2>
              <p className="text-sm sm:text-base text-green-700">
                You've successfully set aside today's tax amount
              </p>
            </div>

            {/* Payout Amount Display */}
            <div className="py-4 md:py-6 space-y-4">
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-inner border border-green-100">
                <div className="text-xs sm:text-sm font-semibold text-green-600 uppercase tracking-wide mb-1">
                  Today's Payout
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                  {formatCurrency(data.amount, data.currency)}
                </div>
                {data.orderCount && (
                  <div className="text-xs sm:text-sm text-gray-600 mt-2">
                    from {data.orderCount} orders
                  </div>
                )}
              </div>

              {/* Amount Set Aside */}
              <div className="bg-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-center space-x-2">
                  <PiggyBank className="w-6 h-6 text-green-600" />
                  <div>
                    <span className="text-lg font-semibold text-green-900">
                      {formatCurrency(data.taxToSetAside, data.currency)}
                    </span>
                    <span className="text-green-700 ml-2 text-sm">
                      safely set aside for taxes
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Completion Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Completed at {new Date().toLocaleTimeString()}
                </span>
              </div>
              
              {/* Undo Button */}
              {onUndo && (
                <button 
                  onClick={async () => {
                    try {
                      await onUndo()
                      toast.info('Tax set aside has been undone', {
                        description: 'You can mark it as set aside again anytime.',
                      })
                    } catch (error) {
                      toast.error('Failed to undo action', {
                        description: 'Please try again.',
                      })
                    }
                  }}
                  className="group flex items-center justify-center space-x-2 text-sm text-green-600 hover:text-green-800 font-medium transition-all mx-auto px-4 py-2 rounded-lg hover:bg-green-100"
                >
                  <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  <span>Undo this action</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STATE 2: NO PAYOUT TODAY
  if (state === 'no_payout') {
    return (
      <div className={cn("w-full h-full", className)}>
        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-4 md:p-8 h-full flex flex-col justify-between transform transition-all duration-500 ease-out hover:shadow-2xl hover:scale-[1.02]">
          <div className="text-center space-y-4 md:space-y-6 flex-grow flex flex-col justify-center">
            {/* Header */}
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">
                NEXT PAYOUT EXPECTED
              </div>
              <div className="text-4xl sm:text-5xl md:text-7xl font-bold text-zinc-400">
                ~{formatCurrency(data?.amount || 0, data?.currency)}
              </div>
              <div className="text-sm sm:text-base text-zinc-400">
                estimated based on recent activity
              </div>
            </div>

            {/* Estimated amounts */}
            <div className="space-y-4 md:space-y-6 flex-grow">
              <div className="bg-orange-50 rounded-2xl p-4 md:p-6 border border-orange-200">
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <div className="text-xs sm:text-sm font-semibold text-orange-900 uppercase tracking-wide text-center sm:text-left">
                    Estimated Tax to Set Aside
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-600">
                  ~{formatCurrency(data?.taxToSetAside || 0, data?.currency)}
                </div>
              </div>

              <div className="bg-green-50 rounded-2xl p-4 md:p-6 border border-green-200">
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="text-xs sm:text-sm font-semibold text-green-900 uppercase tracking-wide text-center sm:text-left">
                    Estimated Safe to Spend
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600">
                  ~{formatCurrency(data?.safeToSpend || 0, data?.currency)}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center mt-auto">
              <button className="group flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform active:scale-95 min-h-[44px] w-full sm:w-auto">
                <Bell className="w-5 h-5 group-hover:animate-pulse" />
                <span className="text-sm sm:text-base">Remind Me Tomorrow</span>
              </button>
            </div>

            {/* Footer metadata */}
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-zinc-500 mt-4">
              <div className="flex items-center justify-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center justify-center space-x-1">
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
    <div className={cn("w-full h-full", className)}>
      <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 h-full flex flex-col justify-between">
        <div className="text-center space-y-4 md:space-y-6 flex-grow flex flex-col justify-center">
          {/* Header */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">
              TODAY'S PAYOUT RECEIVED
            </div>
            <div className="text-4xl sm:text-5xl md:text-7xl font-bold text-zinc-900">
              {formatCurrency(data.amount, data.currency)}
            </div>
            <div className="text-sm sm:text-base text-zinc-600">
              deposited to your bank
            </div>
          </div>

          <div className="space-y-4 md:space-y-6 flex-grow">
            {/* Warning section - Tax to set aside */}
            <div className="bg-orange-50 rounded-2xl p-4 md:p-6 border border-orange-200">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div className="text-xs sm:text-sm font-semibold text-orange-900 uppercase tracking-wide text-center sm:text-left">
                  SET ASIDE FOR TAXES
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                  Action Required
                </span>
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-600">
                {formatCurrency(data.taxToSetAside, data.currency)}
              </div>
            </div>

            {/* Success section - Safe to spend */}
            <div className="bg-green-50 rounded-2xl p-4 md:p-6 border border-green-200">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-xs sm:text-sm font-semibold text-green-900 uppercase tracking-wide text-center sm:text-left">
                  SAFE TO SPEND
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
                  Available Now
                </span>
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-600">
                {formatCurrency(data.safeToSpend, data.currency)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-auto">
            <button 
              onClick={handleConfirmSetAside}
              disabled={isProcessing}
              className={cn(
                "group relative bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 overflow-hidden transform active:scale-95 min-h-[44px] w-full sm:w-auto",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="relative flex items-center justify-center space-x-2">
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span className="text-sm sm:text-base">{isProcessing ? 'Processing...' : "I've Set This Aside"}</span>
              </div>
            </button>
            
            <button className="group bg-white border-2 border-green-600 text-green-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold hover:bg-green-50 hover:border-green-700 hover:text-green-700 transition-all duration-300 transform hover:scale-105 active:scale-95 min-h-[44px] w-full sm:w-auto">
              <span className="group-hover:translate-x-1 transition-transform duration-200 text-sm sm:text-base">View {data.orderCount} Orders</span>
            </button>
          </div>

          {/* Footer metadata */}
          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-zinc-500 mt-4">
            <div className="flex items-center justify-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{data.date}</span>
            </div>
            <div className="flex items-center justify-center space-x-1">
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