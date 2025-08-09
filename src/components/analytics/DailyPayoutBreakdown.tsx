import React from 'react'
import { DailyPayoutData } from '@/types/tax-dashboard'
import { cn } from '@/lib/utils'

interface DailyPayoutBreakdownProps {
  payouts: DailyPayoutData[]
  isLoading?: boolean
  className?: string
}

const DailyPayoutBreakdown: React.FC<DailyPayoutBreakdownProps> = ({
  payouts,
  isLoading,
  className
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: DailyPayoutData['status']) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      in_transit: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Transit' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' }
    }
    
    const config = statusConfig[status]
    return (
      <span className={cn('px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        {config.label}
      </span>
    )
  }

  const getTaxBreakdownItems = (breakdown: DailyPayoutData['taxBreakdown']) => {
    const items = []
    if (breakdown.gst > 0) items.push({ name: 'GST', amount: breakdown.gst })
    if (breakdown.pst > 0) items.push({ name: 'PST', amount: breakdown.pst })
    if (breakdown.hst > 0) items.push({ name: 'HST', amount: breakdown.hst })
    if (breakdown.qst > 0) items.push({ name: 'QST', amount: breakdown.qst })
    if (breakdown.stateTax > 0) items.push({ name: 'State Tax', amount: breakdown.stateTax })
    if (breakdown.localTax > 0) items.push({ name: 'Local Tax', amount: breakdown.localTax })
    if (breakdown.other > 0) items.push({ name: 'Other', amount: breakdown.other })
    return items
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!payouts || payouts.length === 0) {
    return (
      <div className={cn('bg-white rounded-xl p-8 border border-gray-200 text-center', className)}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No payouts found</h3>
        <p className="mt-1 text-sm text-gray-500">Your upcoming payouts will appear here.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">Daily Payout Tax Breakdown</h3>
        <span className="text-sm text-gray-500">
          Set aside tax from each payout
        </span>
      </div>

      {/* Payouts List */}
      {payouts.map((payout, index) => {
        const taxBreakdownItems = getTaxBreakdownItems(payout.taxBreakdown)
        const isExpanded = index === 0 // Expand the most recent payout by default
        
        return (
          <div
            key={payout.payoutDate}
            className={cn(
              'bg-white rounded-xl border transition-all',
              payout.status === 'pending' && 'border-yellow-200',
              payout.status === 'in_transit' && 'border-blue-200',
              payout.status === 'paid' && 'border-gray-200',
              'hover:shadow-md'
            )}
          >
            {/* Payout Header */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {formatDate(payout.payoutDate)}
                    </h4>
                    {getStatusBadge(payout.status)}
                  </div>
                  {payout.estimatedArrival && payout.status !== 'paid' && (
                    <p className="text-sm text-gray-500">
                      Expected: {formatDate(payout.estimatedArrival)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(payout.payoutAmount)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {payout.ordersCount} orders
                  </p>
                </div>
              </div>

              {/* Tax Set Aside Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-amber-900">
                      Set aside {formatCurrency(payout.taxToSetAside)} for taxes
                    </h5>
                    <p className="text-sm text-amber-700 mt-1">
                      From this {formatCurrency(payout.payoutAmount)} payout, transfer {' '}
                      <span className="font-semibold">{formatCurrency(payout.taxToSetAside)}</span> to your tax savings account
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Gross Sales</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(payout.grossSales)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Processing Fees</p>
                  <p className="text-lg font-semibold text-red-600">
                    -{formatCurrency(payout.fees)}
                  </p>
                </div>
                {payout.refunds > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Refunds</p>
                    <p className="text-lg font-semibold text-red-600">
                      -{formatCurrency(payout.refunds)}
                    </p>
                  </div>
                )}
              </div>

              {/* Tax Breakdown */}
              {taxBreakdownItems.length > 0 && (
                <div className="border-t pt-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Tax Breakdown</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {taxBreakdownItems.map((item) => (
                      <div key={item.name} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-600">{item.name}</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Orders (for expanded view) */}
              {isExpanded && payout.orders.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">
                    Orders in this payout
                  </h5>
                  <div className="space-y-2">
                    {payout.orders.slice(0, 3).map((order) => (
                      <div key={order.orderNumber} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium">{order.orderNumber}</span>
                          <span className="text-gray-500 ml-2">• {order.customer}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900">{formatCurrency(order.amount)}</span>
                          <span className="text-gray-500 ml-2">(+{formatCurrency(order.tax)} tax)</span>
                        </div>
                      </div>
                    ))}
                    {payout.orders.length > 3 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        +{payout.orders.length - 3} more orders
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Summary Footer */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Next 7 Days Total</h4>
            <p className="text-xs text-gray-500 mt-1">Tax to set aside from upcoming payouts</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(
                payouts
                  .filter(p => p.status !== 'paid')
                  .reduce((sum, p) => sum + p.taxToSetAside, 0)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyPayoutBreakdown