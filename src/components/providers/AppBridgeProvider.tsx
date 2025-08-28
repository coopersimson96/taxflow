'use client'

import { AppProvider } from '@shopify/polaris'
import { ReactNode } from 'react'
import '@shopify/polaris/build/esm/styles.css'

interface ShopifyAppProviderProps {
  children: ReactNode
}

export default function ShopifyAppProvider({ children }: ShopifyAppProviderProps) {
  // For now, just provide Polaris - we'll add App Bridge once the UI is converted
  return (
    <AppProvider i18n={{}}>
      {children}
    </AppProvider>
  )
}