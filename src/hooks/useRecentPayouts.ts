import { useState, useEffect } from 'react'
import { clientCache, createCacheKey } from '@/lib/cache'

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

interface UseRecentPayoutsReturn {
  payouts: PayoutItem[]
  isLoading: boolean
  error: string | null
  setPayoutAsAside: (payoutId: string) => Promise<void>
  refresh: () => Promise<void>
  updatePeriod: (period: string, dateRange?: { startDate: string; endDate: string }) => Promise<void>
}

interface UseRecentPayoutsOptions {
  period?: string
  startDate?: string
  endDate?: string
}

export function useRecentPayouts(options: UseRecentPayoutsOptions = {}): UseRecentPayoutsReturn {
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentOptions, setCurrentOptions] = useState(options)

  const fetchRecentPayouts = async (fetchOptions = currentOptions) => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query string from options
      const queryParams = new URLSearchParams()
      if (fetchOptions.period) queryParams.set('period', fetchOptions.period)
      if (fetchOptions.startDate) queryParams.set('startDate', fetchOptions.startDate)
      if (fetchOptions.endDate) queryParams.set('endDate', fetchOptions.endDate)
      
      const queryString = queryParams.toString()
      const url = `/api/analytics/recent-payouts${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent payouts')
      }

      const result = await response.json()
      
      if (result.success) {
        setPayouts(result.data)
      } else {
        throw new Error(result.error || 'Failed to load recent payouts')
      }
    } catch (err) {
      console.error('Error fetching recent payouts:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const setPayoutAsAside = async (payoutId: string) => {
    try {
      const response = await fetch('/api/analytics/recent-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_aside',
          payoutId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update payout status')
      }

      // Update local state optimistically
      setPayouts(prev => prev.map(payout => 
        payout.id === payoutId 
          ? { ...payout, isSetAside: true }
          : payout
      ))
      
    } catch (err) {
      console.error('Error setting payout aside:', err)
      throw err
    }
  }

  const updatePeriod = async (period: string, dateRange?: { startDate: string; endDate: string }) => {
    const newOptions = {
      period,
      ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
    }
    setCurrentOptions(newOptions)
    await fetchRecentPayouts(newOptions)
  }

  useEffect(() => {
    fetchRecentPayouts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    payouts,
    isLoading,
    error,
    setPayoutAsAside,
    refresh: fetchRecentPayouts,
    updatePeriod
  }
}