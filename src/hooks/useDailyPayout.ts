import { useState, useEffect, useCallback, useMemo } from 'react'
import { clientCache, createCacheKey } from '@/lib/cache'

interface DailyPayoutData {
  payoutAmount: number
  taxToSetAside: number
  safeToSpend: number
  orderCount: number
  currency: string
  date: string
  dateRange: string
  isSetAside: boolean
  hasPayoutToday: boolean
  payoutId?: string
}

interface UseDailyPayoutReturn {
  data: DailyPayoutData | null
  isLoading: boolean
  error: string | null
  confirmSetAside: () => Promise<void>
  undoSetAside: () => Promise<void>
  refresh: () => Promise<void>
}

export function useDailyPayout(): UseDailyPayoutReturn {
  const [data, setData] = useState<DailyPayoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDailyPayout = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check cache first
      const cacheKey = createCacheKey('daily-payout')
      const cachedData = clientCache.get<DailyPayoutData>(cacheKey)
      
      if (cachedData) {
        setData(cachedData)
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/analytics/daily-payout')
      
      if (!response.ok) {
        throw new Error('Failed to fetch daily payout data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        // Cache for 2 minutes
        clientCache.set(cacheKey, result.data, 120000)
      } else {
        throw new Error(result.error || 'Failed to load payout data')
      }
    } catch (err) {
      console.error('Error fetching daily payout:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const confirmSetAside = useCallback(async () => {
    if (!data || data.isSetAside) return

    try {
      const response = await fetch('/api/analytics/daily-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_set_aside',
          payoutId: data.payoutId,
          payoutDate: data.date
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update payout status')
      }

      // Update local state optimistically
      setData(prev => prev ? { ...prev, isSetAside: true } : null)
      
      // Clear cache and refresh to get the updated data from shared store
      const cacheKey = createCacheKey('daily-payout')
      clientCache.delete(cacheKey)
      setTimeout(() => fetchDailyPayout(), 500)
      
    } catch (err) {
      console.error('Error confirming set aside:', err)
      throw err
    }
  }, [data, fetchDailyPayout])

  const undoSetAside = async () => {
    if (!data || !data.isSetAside) return

    try {
      const response = await fetch('/api/analytics/daily-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'undo_set_aside',
          payoutId: data.payoutId,
          payoutDate: data.date
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update payout status')
      }

      // Update local state optimistically
      setData(prev => prev ? { ...prev, isSetAside: false } : null)
      
      // Clear cache and refresh to get the updated data from shared store
      const cacheKey = createCacheKey('daily-payout')
      clientCache.delete(cacheKey)
      setTimeout(() => fetchDailyPayout(), 500)
      
    } catch (err) {
      console.error('Error undoing set aside:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchDailyPayout()
  }, [fetchDailyPayout])

  return {
    data,
    isLoading,
    error,
    confirmSetAside,
    undoSetAside,
    refresh: fetchDailyPayout
  }
}