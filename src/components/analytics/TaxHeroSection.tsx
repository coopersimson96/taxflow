import React, { useState } from 'react'
import { TaxHeroSectionProps } from '@/types/tax-dashboard'
import { cn } from '@/lib/utils'

const TaxHeroSection: React.FC<TaxHeroSectionProps> = ({ data, isLoading = false }) => {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Calculate breakdown percentages
  const breakdownItems = [
    { name: 'Federal Tax', amount: data.breakdown.federal, color: '#ef4444' },
    { name: 'GST', amount: data.breakdown.gst, color: '#10b981' },
    { name: 'PST', amount: data.breakdown.pst, color: '#3b82f6' },
    { name: 'HST', amount: data.breakdown.hst, color: '#8b5cf6' },
    { name: 'QST', amount: data.breakdown.qst, color: '#f59e0b' },
    { name: 'State Tax', amount: data.breakdown.state, color: '#06b6d4' },
    { name: 'Local Tax', amount: data.breakdown.local, color: '#84cc16' },
    { name: 'Other', amount: data.breakdown.other, color: '#6b7280' }
  ].filter(item => item.amount > 0)

  if (isLoading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative p-8 md:p-12">
          <div className="animate-pulse">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="h-4 bg-white/20 rounded w-48 mx-auto"></div>
                <div className="h-16 bg-white/20 rounded w-80 mx-auto"></div>
                <div className="h-6 bg-white/20 rounded w-64 mx-auto"></div>
              </div>
              <div className="flex justify-center space-x-4">
                <div className="h-12 bg-white/20 rounded w-32"></div>
                <div className="h-12 bg-white/20 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <defs>
            <pattern id="hero-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-pattern)"/>
        </svg>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-8 left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-300/20 rounded-full blur-lg"></div>
      </div>

      <div className="relative p-8 md:p-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Amount Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <h1 className="text-lg md:text-xl font-medium text-white/90">
                Tax Money to Set Aside
              </h1>
            </div>
            
            <div className="space-y-2">
              <div className="text-5xl md:text-7xl font-bold text-white tracking-tight">
                {formatCurrency(data.totalAmount, data.currency)}
              </div>
              <div className="text-white/80 text-lg md:text-xl">
                From your last {data.periodDays} days of Shopify sales
              </div>
            </div>
          </div>

          {/* Key Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-white/70 text-sm font-medium mb-1">Recommended Rate</div>
              <div className="text-2xl font-bold text-white">
                {formatPercentage(data.recommendedSavingsRate)}
              </div>
              <div className="text-white/60 text-xs mt-1">of gross sales</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-white/70 text-sm font-medium mb-1">Last Updated</div>
              <div className="text-lg font-semibold text-white">
                {new Date(data.lastCalculated).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-white/60 text-xs mt-1">Real-time sync</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-white/70 text-sm font-medium mb-1">Tax Categories</div>
              <div className="text-2xl font-bold text-white">
                {breakdownItems.length}
              </div>
              <div className="text-white/60 text-xs mt-1">active jurisdictions</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button className="group relative bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <span>Transfer to Tax Savings</span>
              </div>
            </button>
            
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-4 rounded-xl font-medium hover:bg-white/30 transition-all duration-200 border border-white/30"
            >
              <div className="flex items-center space-x-2">
                <span>View Breakdown</span>
                <svg 
                  className={cn("w-4 h-4 transition-transform duration-200", showBreakdown && "rotate-180")}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Expandable Breakdown */}
          {showBreakdown && (
            <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Tax Breakdown by Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {breakdownItems.map((item, index) => {
                  const percentage = data.totalAmount > 0 ? (item.amount / data.totalAmount) * 100 : 0
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-white font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {formatCurrency(item.amount, data.currency)}
                        </div>
                        <div className="text-white/70 text-sm">
                          {formatPercentage(percentage)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Important Notice */}
          <div className="max-w-2xl mx-auto bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-left">
                <div className="font-medium text-yellow-200 text-sm">
                  Important Tax Notice
                </div>
                <div className="text-yellow-100/90 text-sm mt-1">
                  Keep this money separate from your operating funds. Tax obligations are calculated based on your sales location and applicable tax rates. Consult with a tax professional for specific guidance.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaxHeroSection