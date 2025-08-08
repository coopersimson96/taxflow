import React, { useState } from 'react'
import { TaxTrendsChartProps, ChartTimeRange } from '@/types/tax-dashboard'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts'
import { cn } from '@/lib/utils'

const TaxTrendsChart: React.FC<TaxTrendsChartProps> = ({ 
  data, 
  config, 
  isLoading = false 
}) => {
  const [selectedRange, setSelectedRange] = useState<ChartTimeRange>('30d')
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['totalSales', 'taxCollected'])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Filter data based on selected range
  const getFilteredData = () => {
    if (!data || data.length === 0) return []
    
    const now = new Date()
    const daysBack = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[selectedRange]

    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
    
    return data
      .filter(item => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const filteredData = getFilteredData()

  // Metric configurations
  const metrics = {
    totalSales: {
      name: 'Total Sales',
      key: 'totalSales',
      color: config.colors.primary,
      format: formatCurrency
    },
    taxCollected: {
      name: 'Tax Collected',
      key: 'taxCollected',
      color: config.colors.secondary,
      format: formatCurrency
    },
    taxRate: {
      name: 'Tax Rate',
      key: 'taxRate',
      color: '#8884d8',
      format: formatPercentage
    },
    orderCount: {
      name: 'Orders',
      key: 'orderCount',
      color: '#82ca9d',
      format: (value: number) => value.toLocaleString()
    },
    gst: {
      name: 'GST',
      key: 'gst',
      color: config.colors.gst,
      format: formatCurrency
    },
    pst: {
      name: 'PST',
      key: 'pst',
      color: config.colors.pst,
      format: formatCurrency
    },
    hst: {
      name: 'HST',
      key: 'hst',
      color: config.colors.hst,
      format: formatCurrency
    },
    stateTax: {
      name: 'State Tax',
      key: 'stateTax',
      color: config.colors.stateTax,
      format: formatCurrency
    }
  }

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ]

  const chartTypes = [
    { value: 'area', label: 'Area', icon: '📊' },
    { value: 'line', label: 'Line', icon: '📈' },
    { value: 'bar', label: 'Bar', icon: '📶' }
  ]

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {formatDate(label)}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              const metric = Object.values(metrics).find(m => m.key === entry.dataKey)
              return (
                <p key={index} className="text-sm flex items-center justify-between">
                  <span className="flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: entry.color }}
                    ></span>
                    {metric?.name}:
                  </span>
                  <span className="font-medium ml-2">
                    {metric?.format(entry.value)}
                  </span>
                </p>
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricKey)) {
        return prev.filter(key => key !== metricKey)
      } else {
        return [...prev, metricKey]
      }
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="flex space-x-2">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-8 w-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <div className="h-80 bg-gray-200 rounded mb-4"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-6 w-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Collection Trends</h3>
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No trend data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Charts will appear here once you have historical tax collection data.
          </p>
        </div>
      </div>
    )
  }

  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedMetrics.map(metricKey => {
              const metric = metrics[metricKey as keyof typeof metrics]
              return (
                <Line
                  key={metricKey}
                  type="monotone"
                  dataKey={metricKey}
                  stroke={metric.color}
                  strokeWidth={2}
                  name={metric.name}
                  connectNulls={false}
                />
              )
            })}
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedMetrics.map(metricKey => {
              const metric = metrics[metricKey as keyof typeof metrics]
              return (
                <Bar
                  key={metricKey}
                  dataKey={metricKey}
                  fill={metric.color}
                  name={metric.name}
                  radius={[2, 2, 0, 0]}
                />
              )
            })}
          </BarChart>
        )

      default: // area
        return (
          <AreaChart {...commonProps}>
            <defs>
              {selectedMetrics.map((metricKey, index) => {
                const metric = metrics[metricKey as keyof typeof metrics]
                return (
                  <linearGradient key={metricKey} id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metric.color} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={metric.color} stopOpacity={0.1}/>
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedMetrics.map(metricKey => {
              const metric = metrics[metricKey as keyof typeof metrics]
              return (
                <Area
                  key={metricKey}
                  type="monotone"
                  dataKey={metricKey}
                  stroke={metric.color}
                  fillOpacity={1}
                  fill={`url(#gradient-${metricKey})`}
                  name={metric.name}
                  connectNulls={false}
                />
              )
            })}
          </AreaChart>
        )
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Tax Collection Trends</h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Time range selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value as ChartTimeRange)}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded transition-colors",
                  selectedRange === range.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Chart type selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {chartTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setChartType(type.value as any)}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded transition-colors flex items-center space-x-1",
                  chartType === type.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Metric toggles */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Select Metrics to Display</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(metrics).map(([key, metric]) => (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                selectedMetrics.includes(key)
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: metric.color }}
              ></span>
              <span>{metric.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats for selected range */}
      {filteredData.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-500">Total Sales</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(filteredData.reduce((sum, item) => sum + item.totalSales, 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Tax Collected</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(filteredData.reduce((sum, item) => sum + item.taxCollected, 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Total Orders</div>
            <div className="text-lg font-semibold text-gray-900">
              {filteredData.reduce((sum, item) => sum + item.orderCount, 0).toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Avg. Tax Rate</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatPercentage(
                filteredData.reduce((sum, item) => sum + item.taxRate, 0) / filteredData.length
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaxTrendsChart