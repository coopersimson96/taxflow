'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface Store {
  id: string
  organizationId: string
  name: string
  shopDomain: string
  status: string
}

interface StoreContextType {
  stores: Store[]
  currentStore: Store | null
  setCurrentStore: (store: Store) => void
  loading: boolean
  error: string | null
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [stores, setStores] = useState<Store[]>([])
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkForOrphanedStores = useCallback(async () => {
    try {
      console.log('🔍 Checking for orphaned stores...')
      const orphanedResponse = await fetch('/api/user/find-orphaned-stores')
      if (orphanedResponse.ok) {
        const orphanedData = await orphanedResponse.json()
        const hasOrphaned = orphanedData.orphanedOrganizations?.length > 0 || orphanedData.pendingIntegrations?.length > 0
        
        if (hasOrphaned) {
          console.log('✅ Found orphaned stores, attempting auto-link...')
          // Try to auto-link the first orphaned store
          const linkResponse = await fetch('/api/user/link-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId: orphanedData.orphanedOrganizations?.[0]?.id || orphanedData.pendingIntegrations?.[0]?.organizationId
            })
          })
          
          if (linkResponse.ok) {
            console.log('✅ Auto-linked orphaned store, refreshing...')
            // Note: This will create a dependency cycle, so we'll handle it differently
            return true // Signal that we should refetch
          }
        }
      }
      
      // No orphaned stores found or linking failed - clear cached data
      setCurrentStore(null)
      localStorage.removeItem('currentStoreId')
      return false
    } catch (error) {
      console.error('Error checking orphaned stores:', error)
      // Fallback to clearing cached data
      setCurrentStore(null)
      localStorage.removeItem('currentStoreId')
      return false
    }
  }, [])

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true)
      // Add cache-busting to force fresh data
      const response = await fetch('/api/user/stores?_t=' + Date.now())
      if (response.ok) {
        const data = await response.json()
        setStores(data.stores || [])
        
        // Set current store from localStorage or use first store
        const savedStoreId = localStorage.getItem('currentStoreId')
        if (savedStoreId && data.stores.length > 0) {
          const saved = data.stores.find((s: Store) => s.id === savedStoreId)
          setCurrentStore(saved || data.stores[0])
          // Clean up if saved store no longer exists
          if (!saved && savedStoreId) {
            localStorage.removeItem('currentStoreId')
          }
        } else if (data.stores.length > 0) {
          setCurrentStore(data.stores[0])
          localStorage.setItem('currentStoreId', data.stores[0].id)
        } else {
          // No stores found - check for orphaned stores that might belong to this user
          const shouldRefetch = await checkForOrphanedStores()
          if (shouldRefetch) {
            // Recursive call if orphaned stores were found and linked
            setTimeout(() => fetchStores(), 1000)
          }
        }
      } else {
        setError('Failed to fetch stores')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [checkForOrphanedStores])

  useEffect(() => {
    if (session?.user) {
      fetchStores()
    }
  }, [session, fetchStores])

  const handleSetCurrentStore = (store: Store) => {
    setCurrentStore(store)
    localStorage.setItem('currentStoreId', store.id)
  }

  return (
    <StoreContext.Provider 
      value={{
        stores,
        currentStore,
        setCurrentStore: handleSetCurrentStore,
        loading,
        error
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

// Export as useStoreContext for compatibility
export const useStoreContext = useStore