import React, { useState } from 'react'
import { OrderBreakdownProps, ShopifyOrderDetail } from '@/types/tax-dashboard'
import { cn } from '@/lib/utils'

const OrderBreakdown: React.FC<OrderBreakdownProps> = ({ orders, isLoading = false }) => {
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrderDetail | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'tax'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<'all' | 'taxable' | 'exempt'>('all')

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter and sort orders
  const getProcessedOrders = () => {
    let filtered = orders

    // Apply filter
    if (filterStatus === 'taxable') {
      filtered = orders.filter(order => !order.taxExempt && order.totalTax > 0)
    } else if (filterStatus === 'exempt') {
      filtered = orders.filter(order => order.taxExempt || order.totalTax === 0)
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortBy) {
        case 'amount':
          aValue = a.totalAmount
          bValue = b.totalAmount
          break
        case 'tax':
          aValue = a.totalTax
          bValue = b.totalTax
          break
        default: // date
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      } else {
        const result = String(aValue).localeCompare(String(bValue))
        return sortOrder === 'asc' ? result : -result
      }
    })

    return sorted
  }

  const processedOrders = getProcessedOrders()

  // Calculate tax breakdown for an order
  const getTaxBreakdownItems = (order: ShopifyOrderDetail) => {
    return [
      { name: 'GST', amount: order.taxBreakdown.gst, color: '#10b981' },
      { name: 'PST', amount: order.taxBreakdown.pst, color: '#3b82f6' },
      { name: 'HST', amount: order.taxBreakdown.hst, color: '#8b5cf6' },
      { name: 'QST', amount: order.taxBreakdown.qst, color: '#f59e0b' },
      { name: 'State Tax', amount: order.taxBreakdown.stateTax, color: '#ef4444' },
      { name: 'Local Tax', amount: order.taxBreakdown.localTax, color: '#84cc16' },
      { name: 'Other', amount: order.taxBreakdown.other, color: '#6b7280' }
    ].filter(item => item.amount > 0)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="flex space-x-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-8 w-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header with controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Shopify Orders</h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="taxable">Taxable Only</option>
              <option value="exempt">Tax Exempt</option>
            </select>

            {/* Sort */}
            <div className="flex">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="tax">Sort by Tax</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border-l-0 border border-gray-300 rounded-r-lg text-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{processedOrders.length}</div>
            <div className="text-sm text-gray-600">Orders</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(processedOrders.reduce((sum, order) => sum + order.totalAmount, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Sales</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(processedOrders.reduce((sum, order) => sum + order.totalTax, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Tax</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {processedOrders.filter(order => order.taxExempt).length}
            </div>
            <div className="text-sm text-gray-600">Tax Exempt</div>
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="divide-y divide-gray-200">
        {processedOrders.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 10H6L5 9z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'all' 
                ? "Orders will appear here once your Shopify store processes sales."
                : `No ${filterStatus === 'taxable' ? 'taxable' : 'tax exempt'} orders found with current filters.`
              }
            </p>
          </div>
        ) : (
          processedOrders.map((order) => (
            <div 
              key={order.id} 
              className={cn(
                "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                selectedOrder?.id === order.id && "bg-blue-50 border-l-4 border-l-blue-500"
              )}
              onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
            >
              <div className="flex items-center justify-between">
                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 10H6L5 9z" />
                        </svg>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Order #{order.orderNumber}
                        </p>
                        {order.taxExempt && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Tax Exempt
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{formatDate(order.date)}</span>
                        {order.customerName && <span>{order.customerName}</span>}
                        <span>{order.jurisdiction.country}</span>
                        {order.jurisdiction.province && <span>{order.jurisdiction.province}</span>}
                        {order.jurisdiction.state && <span>{order.jurisdiction.state}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex items-center space-x-6 text-right">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className={cn(
                      "text-sm font-medium",
                      order.totalTax > 0 ? "text-green-600" : "text-gray-400"
                    )}>
                      {formatCurrency(order.totalTax, order.currency)}
                    </div>
                    <div className="text-xs text-gray-500">Tax</div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg 
                      className={cn(
                        "w-4 h-4 text-gray-400 transition-transform duration-200",
                        selectedOrder?.id === order.id && "rotate-180"
                      )}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {selectedOrder?.id === order.id && (
                <div className="mt-4 pl-11 space-y-4 border-t border-gray-200 pt-4">
                  {/* Tax breakdown */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Tax Breakdown</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getTaxBreakdownItems(order).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm text-gray-700">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.amount, order.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order items */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Items ({order.items.length})</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            <div className="text-gray-500">Qty: {item.quantity} × {formatCurrency(item.unitPrice, order.currency)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{formatCurrency(item.totalPrice, order.currency)}</div>
                            <div className="text-gray-500">+{formatCurrency(item.taxAmount, order.currency)} tax</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer info */}
                  {(order.customerName || order.customerEmail) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Customer</h4>
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        {order.customerName && (
                          <div className="text-gray-900">{order.customerName}</div>
                        )}
                        {order.customerEmail && (
                          <div className="text-gray-600">{order.customerEmail}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Exemption reason */}
                  {order.taxExempt && order.exemptionReason && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Tax Exemption Reason</h4>
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        {order.exemptionReason}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default OrderBreakdown