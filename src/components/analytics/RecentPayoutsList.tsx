import React, { useState } from 'react'
import { ChevronDown, Check, AlertCircle, Calendar, ShoppingBag, User, DollarSign, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaxBreakdown {
  type: string
  amount: number
  percentage: number
  color: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  timestamp: string
  customerName: string
  orderTotal: number
  taxCollected: number
  taxBreakdown: TaxBreakdown[]
}

interface PayoutItem {
  id: string
  date: string
  amount: number
  currency: string
  taxAmount: number
  isSetAside: boolean
  orderCount: number
  orders?: OrderDetail[]
}

interface RecentPayoutsListProps {
  payouts?: PayoutItem[]
  isLoading?: boolean
  onSetAside?: (payoutId: string) => Promise<void>
  onExportPayout?: (payoutId: string) => void
  className?: string
}

const RecentPayoutsList: React.FC<RecentPayoutsListProps> = ({
  payouts = [],
  isLoading = false,
  onSetAside,
  onExportPayout,
  className
}) => {
  const [expandedPayouts, setExpandedPayouts] = useState<Set<string>>(new Set())
  const [loadingPayouts, setLoadingPayouts] = useState<Set<string>>(new Set())
  const [processingSetAside, setProcessingSetAside] = useState<Set<string>>(new Set())

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const toggleExpanded = async (payoutId: string) => {
    const newExpanded = new Set(expandedPayouts)
    
    if (newExpanded.has(payoutId)) {
      newExpanded.delete(payoutId)
    } else {
      newExpanded.add(payoutId)
      
      // Simulate lazy loading of order details
      setLoadingPayouts(prev => new Set(prev).add(payoutId))
      
      // In real implementation, this would fetch order details
      setTimeout(() => {
        setLoadingPayouts(prev => {
          const newSet = new Set(prev)
          newSet.delete(payoutId)
          return newSet
        })
      }, 800)
    }
    
    setExpandedPayouts(newExpanded)
  }

  const handleSetAside = async (payoutId: string) => {
    if (!onSetAside) return
    
    setProcessingSetAside(prev => new Set(prev).add(payoutId))
    
    try {
      await onSetAside(payoutId)
    } finally {
      setProcessingSetAside(prev => {
        const newSet = new Set(prev)
        newSet.delete(payoutId)
        return newSet
      })
    }
  }

  const getTaxBreakdownColor = (type: string) => {
    const colors: Record<string, string> = {
      'state': 'bg-blue-500',
      'gst': 'bg-green-500',
      'pst': 'bg-purple-500',
      'local': 'bg-amber-500',
      'hst': 'bg-indigo-500',
      'federal': 'bg-red-500'
    }
    return colors[type.toLowerCase()] || 'bg-gray-500'
  }

  // Loading State
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="text-xl font-semibold mb-4">RECENT PAYOUTS</h3>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-28"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (payouts.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="text-xl font-semibold mb-4">RECENT PAYOUTS</h3>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700 mb-2">No Recent Payouts</h4>
          <p className="text-slate-500">Your recent payouts will appear here once you start receiving them.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-xl font-semibold mb-4">RECENT PAYOUTS</h3>
      
      <div className="space-y-3">
        {payouts.slice(0, 5).map((payout) => {
          const isExpanded = expandedPayouts.has(payout.id)
          const isLoadingOrders = loadingPayouts.has(payout.id)
          const isProcessing = processingSetAside.has(payout.id)
          
          return (
            <div
              key={payout.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-300 transform hover:scale-[1.01]"
            >
              {/* Main Payout Info */}
              <div className="flex justify-between items-start">
                {/* Left side: Date and amounts */}
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-900">
                    {formatDate(payout.date)}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(payout.amount, payout.currency)}
                  </div>
                  <div className="text-sm text-amber-600">
                    → Set aside: {formatCurrency(payout.taxAmount, payout.currency)}
                  </div>
                </div>

                {/* Right side: Status and action */}
                <div className="flex items-center space-x-3">
                  {payout.isSetAside ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                        Done
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <button
                        onClick={() => handleSetAside(payout.id)}
                        disabled={isProcessing}
                        className={cn(
                          "px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-all duration-300 transform hover:scale-105 active:scale-95",
                          isProcessing && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isProcessing ? (
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Setting...</span>
                          </div>
                        ) : (
                          'Set Aside'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* View Orders Button */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => toggleExpanded(payout.id)}
                  className="group flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 transition-all duration-300 transform hover:scale-105"
                >
                  <span>View {payout.orderCount} Orders</span>
                  <ChevronDown 
                    className={cn(
                      "w-4 h-4 transition-all duration-300 group-hover:text-indigo-600",
                      isExpanded && "rotate-180"
                    )} 
                  />
                </button>
              </div>

              {/* Expandable Orders Section */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {isLoadingOrders ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 ml-4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3 ml-8"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Sample Order Details */}
                      <div className="space-y-3">
                        {[...Array(Math.min(3, payout.orderCount))].map((_, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <ShoppingBag className="w-4 h-4 text-slate-400" />
                              <span className="text-sm font-medium text-slate-900">
                                #{1000 + i} - {new Date().toLocaleDateString()}
                              </span>
                            </div>
                            <div className="ml-6 space-y-1">
                              <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <User className="w-3 h-3" />
                                <span>Customer {i + 1}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-base font-semibold text-slate-900">
                                <DollarSign className="w-3 h-3" />
                                <span>{formatCurrency(150 + (i * 75), payout.currency)}</span>
                              </div>
                              <div className="ml-4 space-y-1 text-xs text-slate-600">
                                <div>└─ Tax collected: {formatCurrency(15 + (i * 7.5), payout.currency)}</div>
                                <div className="ml-4">├─ State Tax (CA): {formatCurrency(10 + (i * 5), payout.currency)} (8.25%)</div>
                                <div className="ml-4">└─ Local Tax: {formatCurrency(5 + (i * 2.5), payout.currency)} (2.5%)</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {payout.orderCount > 3 && (
                          <button className="group text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-all duration-300 transform hover:scale-105">
                            <span className="group-hover:translate-x-1 transition-transform duration-200">Show all {payout.orderCount} orders →</span>
                          </button>
                        )}
                      </div>

                      {/* Tax Breakdown Visualization */}
                      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                          TAX BREAKDOWN FOR THIS PAYOUT
                        </h4>
                        
                        <div className="space-y-2">
                          {[
                            { type: 'State Tax (CA)', amount: payout.taxAmount * 0.7, percentage: 70, color: 'blue' },
                            { type: 'Local Tax', amount: payout.taxAmount * 0.2, percentage: 20, color: 'amber' },
                            { type: 'Special District', amount: payout.taxAmount * 0.1, percentage: 10, color: 'purple' }
                          ].map((tax, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700">{tax.type}</span>
                                <span className="text-slate-900 font-semibold">
                                  {formatCurrency(tax.amount, payout.currency)} ({tax.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                  className={cn(
                                    "h-2 rounded-full transition-all duration-500",
                                    getTaxBreakdownColor(tax.color)
                                  )}
                                  style={{ width: `${tax.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Export Button */}
                        <div className="pt-3 border-t border-slate-200">
                          <button
                            onClick={() => onExportPayout?.(payout.id)}
                            className="group flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-all duration-300 transform hover:scale-105 active:scale-95"
                          >
                            <FileText className="w-4 h-4 group-hover:animate-pulse" />
                            <span>Export This Payout's Data</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RecentPayoutsList