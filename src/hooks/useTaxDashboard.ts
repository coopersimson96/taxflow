import { useState, useEffect } from 'react'
import { TaxDashboardData, DashboardFilters, DashboardState } from '@/types/tax-dashboard'

interface UseTaxDashboardOptions {
  organizationId?: string
  autoRefresh?: boolean
  refreshInterval?: number
  initialFilters?: Partial<DashboardFilters>
}

interface UseTaxDashboardReturn {
  data: TaxDashboardData | null
  state: DashboardState
  filters: DashboardFilters
  updateFilters: (newFilters: Partial<DashboardFilters>) => void
  refresh: () => Promise<void>
  isInitialLoading: boolean
}

const defaultFilters: DashboardFilters = {
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    preset: '30days'
  },
  orderStatus: 'all',
  includeRefunds: false
}

export function useTaxDashboard(options: UseTaxDashboardOptions = {}): UseTaxDashboardReturn {
  const {
    organizationId,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    initialFilters = {}
  } = options

  const [data, setData] = useState<TaxDashboardData | null>(null)
  const [state, setState] = useState<DashboardState>({
    isLoading: false,
    lastRefresh: new Date().toISOString(),
    dataFreshness: 'fresh'
  })
  const [filters, setFilters] = useState<DashboardFilters>({
    ...defaultFilters,
    ...initialFilters
  })
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const fetchData = async (showLoading = true) => {
    // Allow empty organizationId - the API will auto-detect the connected store
    // if (!organizationId) return
    
    console.log('🔍 useTaxDashboard fetchData called', { organizationId, showLoading })

    if (showLoading) {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }))
    }

    try {
      // Calculate days from date range
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))

      const params = new URLSearchParams({
        days: Math.max(1, days).toString(),
        includeTrends: 'true'
      })
      
      // Only add organizationId if it's not empty (let API auto-detect if empty)
      if (organizationId && organizationId.trim() !== '') {
        params.set('organizationId', organizationId)
      }

      const apiUrl = `/api/analytics/tax-dashboard?${params}`
      console.log('🔍 Making API call to:', apiUrl)
      
      const response = await fetch(apiUrl)
      console.log('🔍 API response status:', response.status)
      
      if (!response.ok) {
        // Don't fallback to sample data - show real state
        if (response.status === 404) {
          // No store connected - this is expected
          console.log('No Shopify store connected')
          setData(null)
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: undefined,
            lastRefresh: new Date().toISOString(),
            dataFreshness: 'fresh'
          }))
          return
        }
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('🔍 API response data preview:', {
        success: result.success,
        hasData: !!result.data,
        storeInfo: result.data?.storeInfo,
        taxToSetAside: result.data?.taxToSetAside?.totalAmount
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setData(result.data)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: undefined,
        lastRefresh: new Date().toISOString(),
        dataFreshness: 'fresh'
      }))

    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred while fetching data',
        dataFreshness: 'outdated'
      }))
    } finally {
      setIsInitialLoading(false)
    }
  }

  const updateFilters = (newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters }
      
      // Handle preset date ranges
      if (newFilters.dateRange?.preset) {
        const now = new Date()
        const preset = newFilters.dateRange.preset
        let start: Date
        
        switch (preset) {
          case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case '7days':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30days':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90days':
            start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          case '1year':
            start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          default:
            return updated
        }
        
        updated.dateRange = {
          ...updated.dateRange,
          start: start.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          preset
        }
      }
      
      return updated
    })
  }

  const refresh = async () => {
    await fetchData(true)
  }

  // Initial data fetch
  useEffect(() => {
    fetchData(true)
  }, [organizationId, filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Only refresh in background if data is getting stale
      const lastRefresh = new Date(state.lastRefresh)
      const now = new Date()
      const timeSinceRefresh = now.getTime() - lastRefresh.getTime()
      
      if (timeSinceRefresh > refreshInterval) {
        setState(prev => ({ ...prev, dataFreshness: 'stale' }))
        fetchData(false) // Background refresh without loading state
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, state.lastRefresh]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update data freshness indicator
  useEffect(() => {
    const checkFreshness = () => {
      if (!state.lastRefresh) return

      const lastRefresh = new Date(state.lastRefresh)
      const now = new Date()
      const timeSinceRefresh = now.getTime() - lastRefresh.getTime()
      
      let freshness: DashboardState['dataFreshness']
      if (timeSinceRefresh < 2 * 60 * 1000) { // 2 minutes
        freshness = 'fresh'
      } else if (timeSinceRefresh < 10 * 60 * 1000) { // 10 minutes
        freshness = 'stale'
      } else {
        freshness = 'outdated'
      }

      setState(prev => ({ ...prev, dataFreshness: freshness }))
    }

    // Check immediately and then every minute
    checkFreshness()
    const interval = setInterval(checkFreshness, 60 * 1000)

    return () => clearInterval(interval)
  }, [state.lastRefresh])

  return {
    data,
    state,
    filters,
    updateFilters,
    refresh,
    isInitialLoading
  }
}

// Preset filter configurations
export const filterPresets = {
  today: {
    dateRange: { 
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: 'today' as const 
    },
    orderStatus: 'all' as const,
    includeRefunds: false
  },
  thisWeek: {
    dateRange: { 
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: '7days' as const 
    },
    orderStatus: 'all' as const,
    includeRefunds: false
  },
  thisMonth: {
    dateRange: { 
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: '30days' as const 
    },
    orderStatus: 'all' as const,
    includeRefunds: false
  },
  thisQuarter: {
    dateRange: { 
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: '90days' as const 
    },
    orderStatus: 'all' as const,
    includeRefunds: false
  },
  thisYear: {
    dateRange: { 
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: '1year' as const 
    },
    orderStatus: 'all' as const,
    includeRefunds: false
  }
} as const