'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
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

  useEffect(() => {
    if (session?.user) {
      fetchStores()
    }
  }, [session])

  const fetchStores = async () => {
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
          // No stores - clear any cached data
          setCurrentStore(null)
          localStorage.removeItem('currentStoreId')
        }
      } else {
        setError('Failed to fetch stores')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

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