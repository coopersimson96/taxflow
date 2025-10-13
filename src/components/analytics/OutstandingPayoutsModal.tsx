import React from 'react'
import { X, AlertTriangle, Calendar, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OutstandingPayout {
  id: string
  date: string
  amount: number
  taxAmount: number
  currency: string
  orderCount?: number
  displayDate: string
}

interface OutstandingPayoutsModalProps {
  isOpen: boolean
  onClose: () => void
  payouts: OutstandingPayout[]
  monthYear: string
  totalOutstanding: number
  currency: string
}

const OutstandingPayoutsModal: React.FC<OutstandingPayoutsModalProps> = ({
  isOpen,
  onClose,
  payouts,
  monthYear,
  totalOutstanding,
  currency
}) => {
  const formatCurrency = (amount: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Outstanding Payouts
                  </h2>
                  <p className="text-sm text-gray-600">
                    {monthYear} • {payouts.length} payout{payouts.length !== 1 ? 's' : ''} need attention
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-orange-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="px-6 py-4 bg-orange-50 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-orange-900 uppercase tracking-wide">
                Total Tax Still Needed
              </span>
              <span className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalOutstanding, currency)}
              </span>
            </div>
          </div>

          {/* Payouts List */}
          <div className="max-h-96 overflow-y-auto">
            {payouts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎉</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Set!</h3>
                <p className="text-gray-600">
                  All payouts for {monthYear} have been marked as set aside.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {payouts.map((payout, index) => (
                  <div 
                    key={payout.id}
                    className={cn(
                      "px-6 py-4 hover:bg-gray-50 transition-colors",
                      index === 0 && "bg-orange-25"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {formatDate(payout.date)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Payout: {formatCurrency(payout.amount, payout.currency)}
                            {payout.orderCount && (
                              <span className="ml-2">• {payout.orderCount} orders</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">
                          {formatCurrency(payout.taxAmount, payout.currency)}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Tax Needed
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center space-x-1">
                  <DollarSign className="w-4 h-4" />
                  <span>Mark payouts as "set aside" to track progress</span>
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OutstandingPayoutsModal