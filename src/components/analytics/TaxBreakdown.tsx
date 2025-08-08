import React from 'react'
import { TaxBreakdownProps } from '@/types/tax-dashboard'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const TaxBreakdown: React.FC<TaxBreakdownProps> = ({ breakdown, isLoading = false }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Calculate total tax amount for percentage calculations
  const totalTaxAmount = breakdown.reduce((sum, item) => sum + item.amount, 0)

  // Prepare data for charts
  const pieData = breakdown
    .filter(item => item.amount > 0)
    .map(item => ({
      name: item.name,
      value: item.amount,
      percentage: totalTaxAmount > 0 ? (item.amount / totalTaxAmount) * 100 : 0,
      color: item.color
    }))

  const barData = breakdown
    .filter(item => item.amount > 0)
    .map(item => ({
      name: item.name,
      amount: item.amount,
      rate: item.rate,
      orders: item.applicableOrders,
      taxableAmount: item.totalTaxableAmount
    }))

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Amount: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.payload.percentage.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Tax Collected: {formatCurrency(data.amount)}
          </p>
          <p className="text-sm text-gray-600">
            Tax Rate: {formatPercentage(data.rate)}
          </p>
          <p className="text-sm text-gray-600">
            Orders: {data.orders.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Taxable Sales: {formatCurrency(data.taxableAmount)}
          </p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="mt-6 space-y-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (breakdown.length === 0 || totalTaxAmount === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Breakdown by Category</h3>
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tax data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Tax breakdown will appear here once you have processed orders with tax collection.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Tax Breakdown by Category</h3>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Tax Collected</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalTaxAmount)}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Distribution by Type</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Amount by Category</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => {
                  const breakdownItem = breakdown.find(item => item.name === entry.name)
                  return <Cell key={`bar-cell-${index}`} fill={breakdownItem?.color || '#8884d8'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Detailed Breakdown</h4>
        <div className="space-y-2">
          {breakdown
            .filter(item => item.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .map((item, index) => {
              const percentage = totalTaxAmount > 0 ? (item.amount / totalTaxAmount) * 100 : 0
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatPercentage(item.rate)} rate • {item.applicableOrders.toLocaleString()} orders
                        {item.jurisdiction && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {item.jurisdiction}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatPercentage(percentage)} of total
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-gray-500">Categories</div>
          <div className="text-lg font-semibold text-gray-900">
            {breakdown.filter(item => item.amount > 0).length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-lg font-semibold text-gray-900">
            {breakdown.reduce((sum, item) => sum + item.applicableOrders, 0).toLocaleString()}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Taxable Sales</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(breakdown.reduce((sum, item) => sum + item.totalTaxableAmount, 0))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Avg. Tax Rate</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatPercentage(breakdown.reduce((sum, item) => sum + item.rate, 0) / breakdown.filter(item => item.amount > 0).length || 0)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaxBreakdown