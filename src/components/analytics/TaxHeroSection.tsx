import React, { useState } from 'react'
import { TaxHeroSectionProps } from '@/types/tax-dashboard'
import { cn } from '@/lib/utils'

const TaxHeroSection: React.FC<TaxHeroSectionProps> = ({ data, isLoading = false }) => {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [isDebugLoading, setIsDebugLoading] = useState(false)
  const [isClearingIntegration, setIsClearingIntegration] = useState(false)
  const [clearResult, setClearResult] = useState<any>(null)

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

  const debugPayoutCalculation = async () => {
    setIsDebugLoading(true)
    try {
      const response = await fetch('/api/admin/debug-payout-calculation')
      const result = await response.json()
      setDebugData(result)
    } catch (error) {
      console.error('Debug payout calculation failed:', error)
      setDebugData({ error: 'Failed to fetch debug data' })
    } finally {
      setIsDebugLoading(false)
    }
  }

  const diagnoseShopifyAPI = async () => {
    setIsDebugLoading(true)
    try {
      const response = await fetch('/api/admin/diagnose-shopify-api')
      const result = await response.json()
      setDebugData({ ...result, isDiagnosis: true })
    } catch (error) {
      console.error('Shopify API diagnosis failed:', error)
      setDebugData({ error: 'Failed to diagnose Shopify API', isDiagnosis: true })
    } finally {
      setIsDebugLoading(false)
    }
  }

  const clearInvalidIntegration = async () => {
    setIsClearingIntegration(true)
    try {
      const response = await fetch('/api/admin/clear-integration', {
        method: 'POST'
      })
      const result = await response.json()
      setClearResult(result)
      setDebugData({ ...result, isClearResult: true })
    } catch (error) {
      console.error('Clear integration failed:', error)
      setClearResult({ error: 'Failed to clear integration' })
      setDebugData({ error: 'Failed to clear integration', isClearResult: true })
    } finally {
      setIsClearingIntegration(false)
    }
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
                Today's Tax to Set Aside
              </h1>
            </div>
            
            <div className="space-y-2">
              <div className="text-5xl md:text-7xl font-bold text-white tracking-tight">
                {formatCurrency(data.todayTaxAmount || 0, data.currency)}
              </div>
              <div className="text-white/80 text-lg md:text-xl">
                From today's payout of {formatCurrency(data.todayPayoutAmount || 0, data.currency)}
                <div className="text-white/60 text-sm mt-1">
                  {(data.todayPayoutAmount || 0) > 0 ? 
                    "Based on actual Shopify payout data" : 
                    "⚠️ Shopify API access required - click 'Fix API Access' below"
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Today's Tax Breakdown */}
          {data.todayBreakdown && (() => {
            // Build array of tax items that have values with full descriptive names
            const taxItems = []
            if (data.todayBreakdown.gst > 0) taxItems.push({ name: 'Goods & Services Tax (GST)', amount: data.todayBreakdown.gst, color: 'from-green-400 to-green-600' })
            if (data.todayBreakdown.pst > 0) taxItems.push({ name: 'Provincial Sales Tax (PST)', amount: data.todayBreakdown.pst, color: 'from-blue-400 to-blue-600' })
            if (data.todayBreakdown.hst > 0) taxItems.push({ name: 'Harmonized Sales Tax (HST)', amount: data.todayBreakdown.hst, color: 'from-purple-400 to-purple-600' })
            if (data.todayBreakdown.qst > 0) taxItems.push({ name: 'Quebec Sales Tax (QST)', amount: data.todayBreakdown.qst, color: 'from-orange-400 to-orange-600' })
            if (data.todayBreakdown.stateTax > 0) taxItems.push({ name: 'State Sales Tax', amount: data.todayBreakdown.stateTax, color: 'from-red-400 to-red-600' })
            if (data.todayBreakdown.localTax > 0) taxItems.push({ name: 'Local/City Tax', amount: data.todayBreakdown.localTax, color: 'from-cyan-400 to-cyan-600' })
            if (data.todayBreakdown.other > 0) taxItems.push({ name: 'Other Taxes', amount: data.todayBreakdown.other, color: 'from-gray-400 to-gray-600' })

            // Dynamic grid columns based on number of items
            const gridCols = taxItems.length <= 2 ? 'grid-cols-2' : 
                           taxItems.length <= 3 ? 'grid-cols-3' : 
                           taxItems.length <= 4 ? 'grid-cols-2 md:grid-cols-4' :
                           taxItems.length <= 6 ? 'grid-cols-3 md:grid-cols-6' :
                           'grid-cols-3 md:grid-cols-4'

            return taxItems.length > 0 ? (
              <div className="max-w-4xl mx-auto">
                <h3 className="text-lg font-semibold text-white/90 mb-4 text-center">Today's Tax Breakdown</h3>
                <div className={`grid ${gridCols} gap-4 justify-center`}>
                  {taxItems.map((item, index) => (
                    <div 
                      key={index} 
                      className="group relative overflow-hidden bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      {/* Background gradient effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                      
                      {/* Content */}
                      <div className="relative text-center space-y-2">
                        <div className="text-2xl md:text-3xl font-bold text-white">
                          {formatCurrency(item.amount, data.currency)}
                        </div>
                        <div className="text-white/80 text-xs font-medium tracking-wide">
                          {item.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* Monthly Rolling Total */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/70 text-sm font-medium">Current Month Total</div>
                <div className="text-white/60 text-xs mt-1">Tax set aside {new Date().toLocaleDateString('en-US', { month: 'long' })}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(data.monthlyRollingTotal || 0, data.currency)}
                </div>
                <div className="text-white/60 text-xs mt-1">
                  {data.periodDays} day total: {formatCurrency(data.totalAmount, data.currency)}
                </div>
              </div>
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
                <span>View {data.periodDays} Day Breakdown</span>
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

            <button
              onClick={diagnoseShopifyAPI}
              disabled={isDebugLoading}
              className="bg-red-500 text-white px-6 py-4 rounded-xl font-medium hover:bg-red-600 transition-all duration-200 border border-red-400 disabled:opacity-50"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{isDebugLoading ? 'Diagnosing...' : 'Fix API Access'}</span>
              </div>
            </button>

            <button
              onClick={clearInvalidIntegration}
              disabled={isClearingIntegration}
              className="bg-orange-500 text-white px-6 py-4 rounded-xl font-medium hover:bg-orange-600 transition-all duration-200 border border-orange-400 disabled:opacity-50"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{isClearingIntegration ? 'Clearing...' : 'Clear Invalid Token'}</span>
              </div>
            </button>
          </div>

          {/* Expandable Breakdown */}
          {showBreakdown && (
            <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">{data.periodDays} Day Tax Breakdown</h3>
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

          {/* Debug Results */}
          {debugData && (
            <div className="mt-8 bg-red-600/20 backdrop-blur-sm rounded-xl p-6 border border-red-400/30">
              <h3 className="text-lg font-semibold text-red-100 mb-4">
                {debugData.isDiagnosis ? "Shopify API Diagnosis" : "Debug: Payout Analysis"}
              </h3>
              
              {debugData.error ? (
                <p className="text-red-200">Error: {debugData.error}</p>
              ) : debugData.isClearResult ? (
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-green-100 font-medium mb-2">✅ Clear Integration Result:</p>
                    <p className="text-green-200 text-sm">{debugData.message}</p>
                  </div>

                  {debugData.details && debugData.details.length > 0 && (
                    <div className="bg-white/10 rounded-lg p-4">
                      <p className="text-green-100 font-medium mb-2">Cleared Integrations:</p>
                      {debugData.details.map((detail: any, index: number) => (
                        <div key={index} className="text-green-200 text-sm">
                          • Shop: {detail.shop} (Status: {detail.status})
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-400/30">
                    <p className="text-blue-100 font-medium mb-2">Next Steps:</p>
                    <ol className="text-sm text-blue-200 space-y-1">
                      {debugData.nextSteps && debugData.nextSteps.map((step: string, index: number) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : debugData.isDiagnosis && debugData.troubleshooting ? (
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-red-100 font-medium mb-2">Issue Found:</p>
                    <p className="text-red-200 text-sm">{debugData.error}</p>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-red-100 font-medium mb-2">Debug Info:</p>
                    <pre className="text-red-200 text-xs bg-black/20 p-2 rounded overflow-x-auto">
                      {JSON.stringify(debugData.debugInfo, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-yellow-600/20 rounded-lg p-4 border border-yellow-400/30">
                    <p className="text-yellow-100 font-medium mb-2">Common Causes:</p>
                    <ul className="text-sm text-yellow-200 space-y-1">
                      {debugData.troubleshooting.commonCauses.map((cause: string, index: number) => (
                        <li key={index}>• {cause}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-600/20 rounded-lg p-4 border border-green-400/30">
                    <p className="text-green-100 font-medium mb-2">Next Steps to Fix:</p>
                    <ol className="text-sm text-green-200 space-y-1">
                      {debugData.troubleshooting.nextSteps.map((step: string, index: number) => (
                        <li key={index}>{index + 1}. {step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : debugData.isDiagnosis && debugData.diagnosis ? (
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-red-100 font-medium mb-2">Store Info:</p>
                    <p className="text-red-200 text-sm">Domain: {debugData.diagnosis.shopDomain}</p>
                    <p className="text-red-200 text-sm">Access Token: {debugData.diagnosis.hasAccessToken ? '✅ Present' : '❌ Missing'}</p>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-red-100 font-medium mb-3">API Test Results:</p>
                    <div className="space-y-2 text-sm">
                      {Object.entries(debugData.diagnosis.apiTests).map(([endpoint, result]: [string, any]) => (
                        <div key={endpoint} className="flex justify-between items-center">
                          <span className="text-red-200">{endpoint}:</span>
                          <span className={`font-medium ${result.ok ? 'text-green-300' : 'text-red-300'}`}>
                            {result.ok ? '✅ OK' : `❌ ${result.status || 'Failed'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-red-100 font-medium mb-2">Recommendations:</p>
                    <div className="space-y-1 text-sm">
                      {debugData.diagnosis.recommendations.map((rec: string, index: number) => (
                        <p key={index} className={`${rec.startsWith('✅') ? 'text-green-300' : 'text-red-300'}`}>
                          {rec}
                        </p>
                      ))}
                    </div>
                  </div>

                  {debugData.diagnosis.nextSteps && (
                    <div className="bg-yellow-600/20 rounded-lg p-4 border border-yellow-400/30">
                      <p className="text-yellow-100 font-medium mb-2">Next Steps to Fix:</p>
                      <ol className="text-sm text-yellow-200 space-y-1">
                        {debugData.diagnosis.nextSteps.map((step: string, index: number) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ) : debugData.debug ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-lg p-4">
                      <p className="text-red-100 font-medium">Today's Calculated</p>
                      <p className="text-2xl font-bold text-red-50">{formatCurrency(debugData.debug.todayStats.estimatedPayout, data.currency)}</p>
                      <p className="text-xs text-red-200">{debugData.debug.todayStats.transactionCount} transactions</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <p className="text-red-100 font-medium">Actual Shopify Payout</p>
                      <p className="text-2xl font-bold text-red-50">{formatCurrency(debugData.debug.actualShopifyPayout, data.currency)}</p>
                      <p className="text-xs text-red-200">Aug 19th payout</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <p className="text-red-100 font-medium">Difference</p>
                      <p className="text-2xl font-bold text-orange-300">{formatCurrency(debugData.debug.difference, data.currency)}</p>
                      <p className="text-xs text-red-200">Missing amount</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-red-200">Loading diagnosis...</p>
              )}
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