'use client'

import { AppProvider } from '@shopify/polaris'
import { ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { useEmbedded } from '@/hooks/useEmbedded'
import { EMBEDDED_APP_CONFIG } from '@/config/shopify-embed'
import '@shopify/polaris/build/esm/styles.css'

interface ShopifyAppProviderProps {
  children: ReactNode
}

interface AppBridgeContextType {
  ready: boolean
  shop: string | null
}

const AppBridgeContext = createContext<AppBridgeContextType>({
  ready: false,
  shop: null
})

export const useAppBridge = () => useContext(AppBridgeContext)

export default function ShopifyAppProvider({ children }: ShopifyAppProviderProps) {
  const { isEmbedded } = useEmbedded()
  const [appBridgeReady, setAppBridgeReady] = useState(false)
  const [shop, setShop] = useState<string | null>(null)

  useEffect(() => {
    if (isEmbedded && typeof window !== 'undefined') {
      // Extract shop from URL or session
      const urlParams = new URLSearchParams(window.location.search)
      const shopDomain = urlParams.get('shop')
      
      if (shopDomain) {
        setShop(shopDomain)
      }

      // Log readiness for App Bridge
      console.log('🔗 App Bridge Configuration:', {
        embedded: isEmbedded,
        shop: shopDomain,
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ? 'Set' : 'Missing',
        config: EMBEDDED_APP_CONFIG
      })

      setAppBridgeReady(true)

      // Future: Initialize actual App Bridge here when ready
      // const app = createApp({
      //   apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      //   shopOrigin: shopDomain!,
      // })
    }
  }, [isEmbedded])

  return (
    <AppBridgeContext.Provider value={{ ready: appBridgeReady, shop }}>
      <AppProvider 
        i18n={{
          Polaris: {
            Common: {
              undo: 'Undo',
              redo: 'Redo',
              save: 'Save',
            },
          },
        }}
      >
        {children}
      </AppProvider>
    </AppBridgeContext.Provider>
  )
}