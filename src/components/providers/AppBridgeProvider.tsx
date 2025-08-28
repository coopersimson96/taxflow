'use client'

import { AppProvider } from '@shopify/polaris'
import { ReactNode, useEffect } from 'react'
import { useEmbedded } from '@/hooks/useEmbedded'
import '@shopify/polaris/build/esm/styles.css'

interface ShopifyAppProviderProps {
  children: ReactNode
}

export default function ShopifyAppProvider({ children }: ShopifyAppProviderProps) {
  const { isEmbedded } = useEmbedded()

  useEffect(() => {
    // Initialize App Bridge if embedded and API key is available
    if (isEmbedded && process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
      // App Bridge initialization will be added here once we're ready to fully embed
      console.log('🔗 App Bridge ready for initialization')
    }
  }, [isEmbedded])

  return (
    <AppProvider 
      i18n={{}}
      // Add theme support for embedded mode
      theme={isEmbedded ? undefined : undefined}
    >
      {children}
    </AppProvider>
  )
}