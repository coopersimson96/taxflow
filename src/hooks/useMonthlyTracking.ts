import { useState, useEffect } from 'react'

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

  const fetchMonthlyTracking = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/monthly-tracking?month=${targetMonth}&year=${targetYear}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch monthly tracking data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to load monthly tracking data')
      }
    } catch (err) {
      console.error('Error fetching monthly tracking:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMonthlyTracking()
  }, [targetMonth, targetYear])

  return {
    data,
    isLoading,
    error,
    refresh: fetchMonthlyTracking
  }
}