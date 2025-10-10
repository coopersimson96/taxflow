import { useState, useEffect } from 'react'

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
}

export function useRecentPayouts(): UseRecentPayoutsReturn {
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecentPayouts = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/analytics/recent-payouts')
      
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

  useEffect(() => {
    fetchRecentPayouts()
  }, [])

  return {
    payouts,
    isLoading,
    error,
    setPayoutAsAside,
    refresh: fetchRecentPayouts
  }
}