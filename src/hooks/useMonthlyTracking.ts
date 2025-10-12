import { useState, useEffect, useCallback, useMemo } from 'react'
import { clientCache, createCacheKey } from '@/lib/cache'

interface MonthlyTrackingData {
  month: string
  year: number
  totalTaxToTrack: number
  totalSetAside: number
  totalRemaining: number
  currency: string
  payoutCount: number
  averagePerPayout: number
  completionPercentage: number
}

interface UseMonthlyTrackingReturn {
  data: MonthlyTrackingData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useMonthlyTracking(month?: number, year?: number): UseMonthlyTrackingReturn {
  const [data, setData] = useState<MonthlyTrackingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Default to current month/year if not provided
  const currentDate = new Date()
  const targetMonth = month ?? currentDate.getMonth() + 1
  const targetYear = year ?? currentDate.getFullYear()

  const fetchMonthlyTracking = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check cache first
      const cacheKey = createCacheKey('monthly-tracking', { month: targetMonth, year: targetYear })
      const cachedData = clientCache.get<MonthlyTrackingData>(cacheKey)
      
      if (cachedData) {
        setData(cachedData)
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/analytics/monthly-tracking?month=${targetMonth}&year=${targetYear}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch monthly tracking data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        // Cache for 5 minutes
        clientCache.set(cacheKey, result.data, 300000)
      } else {
        throw new Error(result.error || 'Failed to load monthly tracking data')
      }
    } catch (err) {
      console.error('Error fetching monthly tracking:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [targetMonth, targetYear])

  useEffect(() => {
    fetchMonthlyTracking()
  }, [fetchMonthlyTracking])

  return {
    data,
    isLoading,
    error,
    refresh: fetchMonthlyTracking
  }
}